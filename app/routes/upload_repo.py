import os
import json
import ast
import shutil
import tempfile
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.services.rag_service import hybrid_retriever as retriever
from app.core.limiter import limiter

# Safely import GitPython without crashing server if git binary is unlinked
try:
    os.environ.setdefault("GIT_PYTHON_REFRESH", "0")
    from git import Repo
except Exception:
    Repo = None

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
EXCLUDED_DIRS = {
    "venv", 
    ".venv", 
    "node_modules", 
    "__pycache__", 
    ".git", 
    ".mypy_cache", 
    "dist", 
    "build", 
    ".vite", 
    ".gemini", 
    "data", 
    "brain",
    ".idea",
    ".vscode"
}

# Massive lockfiles, bundles, or minified files to skip during indexing
EXCLUDED_FILES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Pipfile.lock",
    "Cargo.lock",
    "composer.lock",
    "npm-shrinkwrap.json",
}

def is_ignored_file(filename: str) -> bool:
    name_lower = filename.lower()
    if name_lower in EXCLUDED_FILES:
        return True
    if name_lower.endswith((".min.js", ".min.css", ".map", ".bundle.js", ".bundle.css")):
        return True
    return False

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
CLONED_REPOS_DIR = os.path.join(os.getcwd(), "data", "cloned_repos")

# Save the currently active repository info into active_repo.json
def save_active_repo(name: str, path: str):
    if not name or name.startswith("tmp") or not path or "tmp" in name:
        return
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
    if not name or name.startswith("tmp") or not path or "tmp" in name:
        return
    repos = load_repos()
    repos[name] = path
    with open(REPO_REGISTRY, "w") as f:
        json.dump(repos, f, indent=2)

# Load all registered repositories from JSON
def load_repos() -> dict:
    if not os.path.exists(REPO_REGISTRY):
        return {}
    try:
        with open(REPO_REGISTRY) as f:
            data = json.load(f)
            # Filter out stale temp entries and empty keys
            filtered = {
                k: v for k, v in data.items()
                if k and not k.startswith("tmp") and v and "/tmp/" not in v and "/var/folders/" not in v
            }
            return filtered
    except Exception:
        return {}

# Helper to resolve paths across host/Docker environments
def resolve_repo_path(input_path: str) -> str:
    path = input_path.strip()
    if path in (".", "./", "/app"):
        return "/app" if os.path.exists("/app") else os.getcwd()

    # If path directly exists
    if os.path.exists(path):
        return os.path.abspath(path)

    # Check relative to cwd
    cwd_rel = os.path.join(os.getcwd(), path)
    if os.path.exists(cwd_rel):
        return os.path.abspath(cwd_rel)

    # In Docker: if user entered the host path of the current workspace repository
    # (e.g. "/Users/.../devpilot-ai" when running inside container where project is mounted at /app)
    if os.path.exists("/app"):
        base_target = os.path.basename(path.rstrip("/\\")).lower()
        if base_target in ("devpilot-ai", "app", os.path.basename(os.getcwd()).lower()) or path.rstrip("/\\").endswith("devpilot-ai"):
            return "/app"

    return path

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

# Endpoint: Get currently active repository
@router.get("/repos/active")
def get_active_repo():
    active = load_active_repo()
    if not active:
        repos = load_repos()
        if repos:
            first_name = list(repos.keys())[0]
            active = {"name": first_name, "path": repos[first_name]}
    return active

# Endpoint: List all registered repositories
@router.get("/repos")
def list_repos():
    return load_repos()

# Endpoint: List all registered repositories with detailed metadata
@router.get("/repos/details")
def get_repos_details():
    repos = load_repos()
    active = load_active_repo()
    active_path = active.get("path") if active else None
    
    details = []
    for name, path in repos.items():
        exists = os.path.exists(path)
        file_count = 0
        total_size_bytes = 0
        if exists and os.path.isdir(path):
            try:
                for root, dirs, files in os.walk(path):
                    dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
                    for f in files:
                        if not is_ignored_file(f) and f.endswith(SUPPORTED_EXT):
                            file_count += 1
                            try:
                                total_size_bytes += os.path.getsize(os.path.join(root, f))
                            except Exception:
                                pass
            except Exception:
                pass
        
        is_active = (path == active_path)
        chunks_count = len(retriever.vector.store.texts) if is_active else 0
        
        details.append({
            "name": name,
            "path": path,
            "exists": exists,
            "file_count": file_count,
            "size_kb": round(total_size_bytes / 1024, 1),
            "chunks_count": chunks_count,
            "is_active": is_active,
        })
    return {"repositories": details, "total": len(details)}

# Endpoint: Delete a registered repository
@router.delete("/repos/{name}")
def delete_repo(name: str):
    repos = load_repos()
    if name not in repos:
        return JSONResponse(status_code=404, content={"error": f"Repository '{name}' not found."})
    
    deleted_path = repos.pop(name)
    with open(REPO_REGISTRY, "w") as f:
        json.dump(repos, f, indent=2)
    
    # If the deleted repo was active, switch active repo to remaining or clear
    active = load_active_repo()
    if active and (active.get("name") == name or active.get("path") == deleted_path):
        if repos:
            first_name = list(repos.keys())[0]
            save_active_repo(first_name, repos[first_name])
            retriever.switch_repo(repos[first_name])
        else:
            if os.path.exists(ACTIVE_REPO_FILE):
                os.remove(ACTIVE_REPO_FILE)
            retriever.clear()
            
    return {"message": f"Repository '{name}' removed from registry.", "remaining": len(repos)}

# Endpoint: Upload and index a local repository path
@router.post("/upload-repo")
async def upload_repo(request: RepoRequest):
    raw_path = request.path.strip() if request.path else ""
    if not raw_path:
        return JSONResponse(
            status_code=400,
            content={"error": "Path cannot be empty.", "chunks_added": 0}
        )

    path = resolve_repo_path(raw_path)

    if not os.path.exists(path):
        return JSONResponse(
            status_code=400,
            content={
                "error": f"Directory not found: '{raw_path}'. If running in Docker, ensure the path is accessible inside the container or use '.' / '/app'.",
                "chunks_added": 0
            }
        )

    if not os.path.isdir(path):
        return JSONResponse(
            status_code=400,
            content={
                "error": f"Path '{raw_path}' is not a directory.",
                "chunks_added": 0
            }
        )

    repo_name = os.path.basename(path.rstrip("/\\")) or "repo"
    if repo_name == "app":
        base_raw = os.path.basename(raw_path.rstrip("/\\"))
        if base_raw and base_raw not in ("app", ".", "./"):
            repo_name = base_raw
        else:
            repo_name = "devpilot-ai"

    all_chunks = []
    all_meta = []

    # Traverse all folders and files in the target directory
    for root, dirs, files in os.walk(path):
        # Skip excluded folders like node_modules or venv
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for file in files:
            # Skip massive lockfiles and bundles to keep indexing fast
            if is_ignored_file(file):
                continue

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
        return JSONResponse(
            status_code=400,
            content={
                "error": f"No supported code files found in '{raw_path}'. (Supported: {', '.join(SUPPORTED_EXT)})",
                "chunks_added": 0
            }
        )

    # Clear previous in-memory and disk indices before building new index
    retriever.clear()

    # Pass code chunks to the hybrid retriever vector store for indexing
    retriever.add_documents(all_chunks, all_meta)
    # Persist index to isolated per-repository cache
    retriever.persist_repo(path)

    save_repo(repo_name, path)
    save_active_repo(repo_name, path)

    return {
        "message": "Repo indexed",
        "chunks_added": len(all_chunks)
    }

# Endpoint: Switch to a different repository (uses instant cached index if available)
@router.post("/repos/switch")
@limiter.limit("5/minute")
async def switch_repo(
    request: Request,
    body: RepoRequest
):
    target = body.path.strip()
    registered = load_repos()

    # If target matches a repo name in registry, resolve to its stored path
    if target in registered:
        target = registered[target]

    # If target is a GitHub URL, redirect to upload_github
    if target.startswith("http://") or target.startswith("https://") or target.startswith("git@"):
        return await upload_github(request, GithubRequest(url=target))

    # Fast-path: Check if pre-built cached index exists for this repository
    resolved_target = resolve_repo_path(target)
    if retriever.switch_repo(resolved_target):
        repo_name = os.path.basename(resolved_target.rstrip("/\\")) or "repo"
        save_repo(repo_name, resolved_target)
        save_active_repo(repo_name, resolved_target)
        return {
            "message": f"Instantly switched to cached index for '{repo_name}'",
            "chunks_added": len(retriever.vector.store.texts)
        }

    return await upload_repo(RepoRequest(path=target))

# Endpoint: Clone a public GitHub repo and index its code
@router.post("/upload-github")
@limiter.limit("5/minute")
async def upload_github(
    request: Request,
    body: GithubRequest
):
    url = body.url.strip()
    if not url:
        return JSONResponse(status_code=400, content={"error": "GitHub URL cannot be empty."})

    repo_name = url.split("/")[-1].replace(".git", "")
    os.makedirs(CLONED_REPOS_DIR, exist_ok=True)
    target_dir = os.path.join(CLONED_REPOS_DIR, repo_name)

    try:
        # If repo is already cloned, pull latest changes or re-clone cleanly
        if os.path.exists(target_dir):
            try:
                repo = Repo(target_dir)
                repo.remotes.origin.pull()
            except Exception:
                shutil.rmtree(target_dir, ignore_errors=True)
                Repo.clone_from(url, target_dir, depth=1)
        else:
            Repo.clone_from(url, target_dir, depth=1)

        # Clear existing FAISS vector and BM25 index
        retriever.clear()

        # Index the cloned repository
        result = await upload_repo(
            RepoRequest(path=target_dir)
        )

        if isinstance(result, JSONResponse):
            return result

        save_repo(repo_name, target_dir)
        save_active_repo(repo_name, target_dir)

        return {
            "message": f"GitHub repo '{repo_name}' indexed",
            "chunks_added": result.get("chunks_added", 0)
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})