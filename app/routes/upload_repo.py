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

# Create a FastAPI Router for handling repo uploads and switching endpoints
router = APIRouter()

# ---------------------------------------------------------
# Configurations & Constants
# ---------------------------------------------------------

# List of file extensions that the code analyzer will scan and index for search
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

# Folders to skip during indexing to avoid searching junk or huge dependency files
EXCLUDED_DIRS = {"venv", ".venv", "node_modules", "__pycache__", ".git", ".mypy_cache"}

# File where registered repositories are saved
REPO_REGISTRY = "repo_registry.json"

# ---------------------------------------------------------
# Request Models (Validation Schemas)
# ---------------------------------------------------------

# Request body structure when a user sends a local folder path
class RepoRequest(BaseModel):
    path: str

# Request body structure when a user sends a GitHub URL
class GithubRequest(BaseModel):
    url: str

# ---------------------------------------------------------
# Helper Functions for File Reading and Code Chunking
# ---------------------------------------------------------

# Safely read text content from a file, returning empty string if reading fails
def read_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return ""

# Basic line-based chunker: Splits long code into chunks of ~30 lines with a 10-line overlap.
# Overlap ensures code context at line boundaries is not cut off.
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

# Smart Python chunker using AST (Abstract Syntax Tree):
# Instead of cutting code at random line numbers, this extracts whole functions and classes together.
def chunk_by_ast(source: str, file_path: str) -> list[str]:
    chunks = []
    lines = source.split("\n")
    try:
        # Parse the Python source code into a syntax tree
        tree = ast.parse(source)
        # Walk through all elements (nodes) in the tree
        for node in ast.walk(tree):
            # If the node is a function or a class definition
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = node.lineno - 1
                end = node.end_lineno
                chunk_lines = lines[start:end]
                chunk = "\n".join(chunk_lines)

                if not chunk.strip():
                    continue

                # Add helpful header comments describing file, type (class/function), and name
                chunk_with_context = (
                    f"# FILE: {file_path}\n"
                    f"# TYPE: {'class' if isinstance(node, ast.ClassDef) else 'function'}\n"
                    f"# NAME: {node.name}\n\n{chunk}"
                )

                # If the function/class is larger than 60 lines, split it into smaller line sub-chunks
                if len(chunk_lines) > 60:
                    sub_chunks = chunk_code_lines(chunk, chunk_size=40, overlap=10)
                    for sc in sub_chunks:
                        chunks.append(f"# FILE: {file_path}\n# NAME : {node.name} (partial)\n\n{sc}")
                else:
                    chunks.append(chunk_with_context)

    except SyntaxError:
        # If code has invalid Python syntax, fallback to standard line chunking below
        pass

    # If AST didn't produce any chunks (e.g. script with only top-level code), fall back to line chunking
    if not chunks:
        chunks = chunk_code_lines(source, chunk_size=30, overlap=10)

    return chunks

# ---------------------------------------------------------
# Repository Registry Functions
# ---------------------------------------------------------

ACTIVE_REPO_FILE = "active_repo.json"

# Save the currently active repository info into active_repo.json
def save_active_repo(name: str, path: str):
    with open(ACTIVE_REPO_FILE, "w") as f:
        json.dump({"name": name, "path": path}, f)

# Load the currently active repository details
def load_active_repo() -> dict:
    if not os.path.exists(ACTIVE_REPO_FILE):
        return {}
    try:
        with open(ACTIVE_REPO_FILE) as f:
            return json.load(f)
    except Exception:
        return {}

# Add or update a repository in the registry file
def save_repo(name: str, path: str):
    repos = load_repos()
    repos[name] = path
    with open(REPO_REGISTRY, "w") as f:
        json.dump(repos, f)

# Load all registered repositories from JSON
def load_repos() -> dict:
    if not os.path.exists(REPO_REGISTRY):
        return {}
    with open(REPO_REGISTRY) as f:
        return json.load(f)

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

# Endpoint: Upload and index a local repository path
@router.post("/upload-repo")
async def upload_repo(request: RepoRequest):
    path = request.path

    repo_name = os.path.basename(path)
    save_repo(repo_name, path)
    save_active_repo(repo_name, path)

    all_chunks = []
    all_meta = []

    # Traverse all folders and files in the target directory
    for root, dirs, files in os.walk(path):
        # Skip excluded folders like node_modules or venv
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in files:
            # Process only supported source code/documentation files
            if file.endswith(SUPPORTED_EXT):
                full_path = os.path.join(root, file)

                content = read_file(full_path)

                if not content.strip():
                    continue

                # Use smart AST chunking for Python files, line chunking for others
                if file.endswith(".py"):
                    chunks = chunk_by_ast(content, full_path)
                else:
                    raw_chunks = chunk_code_lines(content, chunk_size=30, overlap=10)

                    chunks = [
                        f"# File: {full_path}\n\n{chunk}"
                        for chunk in raw_chunks
                    ]

                # Collect valid code chunks and their metadata
                for chunk in chunks:
                    if chunk.strip():
                        all_chunks.append(chunk.strip())
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

    # Pass code chunks to the hybrid retriever vector store for indexing
    retriever.add_documents(all_chunks, all_meta)

    return {
        "message": "Repo indexed",
        "chunks_added": len(all_chunks)
    }

# Endpoint: List all registered repositories
@router.get("/repos")
def list_repos():
    return load_repos()

# Endpoint: Switch to a different repository (clears old FAISS index and re-indexes)
@router.post("/repos/switch")
@limiter.limit("5/minute")
async def switch_repo(
    request: Request,
    body: RepoRequest
):
    # Remove existing FAISS vector index files before building new ones
    for f in ["faiss_index.index", "faiss_index.pkl"]:
        if os.path.exists(f):
            os.remove(f)

    return await upload_repo(body)

# Endpoint: Clone a public GitHub repo and index its code
@router.post("/upload-github")
@limiter.limit("5/minute")
async def upload_github(
    request: Request,
    body: GithubRequest
):
    url = body.url.strip()

    repo_name = url.split("/")[-1].replace(".git", "")
    tmp_dir = tempfile.mkdtemp() # Create a temporary folder to store cloned repo

    try:
        # Clone the repository from GitHub
        Repo.clone_from(url, tmp_dir)

        # Clear existing FAISS vector index files
        for f in ["faiss_index.index", "faiss_index.pkl"]:
            if os.path.exists(f):
                os.remove(f)

        # Index the cloned repository
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
        # Clean up temporary cloned directory
        shutil.rmtree(tmp_dir, ignore_errors=True)