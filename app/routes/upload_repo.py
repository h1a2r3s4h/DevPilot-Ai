import os
import json
import ast
import shutil
import tempfile
from fastapi import APIRouter, Request
from pydantic import BaseModel
from app.services.rag_service import hybrid_retriever as retriever
from app.core.limiter import limiter

from git import Repo


router = APIRouter()

SUPPORTED_EXT = (
    ".py",
    ".js",
    ".jsx",
    ".tsx",
    ".ts",
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".html",
    ".css",
    ".scss"
)
EXCLUDED_DIRS = {"venv", ".venv", "node_modules", "__pycache__", ".git", ".mypy_cache"}
REPO_REGISTRY = "repo_registry.json"

class RepoRequest(BaseModel):
    path: str

class GithubRequest(BaseModel):
    url: str

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return ""

def chunk_code_lines(
    text: str,
    chunk_size: int = 30,
    overlap: int = 10
) -> list[str]:

    lines = text.split("\n")
    chunks = []

    step = chunk_size - overlap

    for i in range(0, len(lines), step):

        chunk = "\n".join(
            lines[i:i + chunk_size]
        )

        if chunk.strip():
            chunks.append(chunk)

    return chunks

def chunk_by_ast(source: str, file_path: str) -> list[str]:
    chunks = []
    lines = source.split("\n")
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = node.lineno - 1
                end = node.end_lineno
                chunk_lines = lines[start:end]
                chunk = "\n".join(chunk_lines)

                if not chunk.strip():
                    continue

                chunk_with_context = (
                    f"# FILE: {file_path}\n"
                    f"# TYPE: {'class' if isinstance(node, ast.ClassDef) else 'function'}\n"
                    f"# NAME: {node.name}\n\n{chunk}"
                )

                if len(chunk_lines) > 60:
                    sub_chunks = chunk_code_lines(chunk, chunk_size=40, overlap=10)
                    for sc in sub_chunks:
                        chunks.append(f"# FILE: {file_path}\n# NAME : {node.name} (partial)\n\n{sc}")
                else:
                    chunks.append(chunk_with_context)

    except SyntaxError:
        pass

    if not chunks:
        chunks = chunk_code_lines(source, chunk_size=30, overlap=10)

    return chunks

ACTIVE_REPO_FILE = "active_repo.json"

def save_active_repo(name: str, path: str):
    with open(ACTIVE_REPO_FILE, "w") as f:
        json.dump({"name": name, "path": path}, f)

def load_active_repo() -> dict:
    if not os.path.exists(ACTIVE_REPO_FILE):
        return {}
    try:
        with open(ACTIVE_REPO_FILE) as f:
            return json.load(f)
    except Exception:
        return {}

def save_repo(name: str, path: str):
    repos = load_repos()
    repos[name] = path
    with open(REPO_REGISTRY, "w") as f:
        json.dump(repos, f)

def load_repos() -> dict:
    if not os.path.exists(REPO_REGISTRY):
        return {}
    with open(REPO_REGISTRY) as f:
        return json.load(f)

@router.post("/upload-repo")
async def upload_repo(request: RepoRequest):
    path = request.path

    repo_name = os.path.basename(path)
    save_repo(repo_name, path)
    save_active_repo(repo_name, path)

    all_chunks = []
    all_meta = []

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in files:
            if file.endswith(SUPPORTED_EXT):
                full_path = os.path.join(root, file)

                content = read_file(full_path)

                if not content.strip():
                    continue

                if file.endswith(".py"):
                    chunks = chunk_by_ast(content, full_path)
                else:
                    raw_chunks = chunk_code_lines(content, chunk_size=30, overlap=10)

                    chunks = [
                        f"# File: {full_path}\n\n{chunk}"
                        for chunk in raw_chunks
                    ]

                for chunk in chunks:
                    if chunk.strip():
                        all_chunks.append(
f"""
FILE: {full_path}
SOURCE: {file}

{chunk}
"""
)
                        all_meta.append({
                            "source": file,
                            "path": full_path,
                            "extension": os.path.splitext(file)[1]
                        })

    if not all_chunks:
        return {
            "message": "No chunks found",
            "chunks_added": 0
        }

    retriever.add_documents(all_chunks, all_meta)

    return {
        "message": "Repo indexed",
        "chunks_added": len(all_chunks)
    }

@router.get("/repos")
def list_repos():
    return load_repos()

@router.post("/repos/switch")
@limiter.limit("5/minute")
async def switch_repo(
    request: Request,
    body: RepoRequest
):
    for f in ["faiss_index.index", "faiss_index.pkl"]:
        if os.path.exists(f):
            os.remove(f)

    return await upload_repo(body)

@router.post("/upload-github")
@limiter.limit("5/minute")
async def upload_github(
    request: Request,
    body: GithubRequest
):
    url = body.url.strip()

    repo_name = url.split("/")[-1].replace(".git", "")
    tmp_dir = tempfile.mkdtemp()

    try:
        Repo.clone_from(url, tmp_dir)

        for f in ["faiss_index.index", "faiss_index.pkl"]:
            if os.path.exists(f):
                os.remove(f)

        result = await upload_repo(
            RepoRequest(path=tmp_dir)
        )

        save_repo(repo_name, url)

        return {
            "message": f"GitHub repo '{repo_name}' indexed",
            "chunks_added": result["chunks_added"]
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)