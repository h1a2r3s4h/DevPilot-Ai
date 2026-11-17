import os
import difflib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/diff", tags=["Diff"])

class DiffPreviewRequest(BaseModel):
    file_path: str
    proposed_content: str

class ApplyDiffRequest(BaseModel):
    file_path: str
    proposed_content: str

def generate_unified_diff(original_text: str, new_text: str, filename: str) -> str:
    orig_lines = original_text.splitlines(keepends=True)
    new_lines = new_text.splitlines(keepends=True)
    
    diff_lines = list(difflib.unified_diff(
        orig_lines,
        new_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}"
    ))
    
    return "".join(diff_lines)

@router.post("/preview")
def preview_diff(request: DiffPreviewRequest):
    """Generate git-style unified diff between existing file and proposed content."""
    abs_path = os.path.abspath(request.file_path)
    
    original_content = ""
    if os.path.exists(abs_path) and os.path.isfile(abs_path):
        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                original_content = f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    filename = os.path.basename(abs_path)
    diff_str = generate_unified_diff(original_content, request.proposed_content, filename)
    
    return {
        "file_path": abs_path,
        "filename": filename,
        "exists": os.path.exists(abs_path),
        "diff": diff_str or "No changes detected.",
        "has_changes": bool(diff_str)
    }

@router.post("/apply")
def apply_diff(request: ApplyDiffRequest):
    """Apply proposed content directly to local workspace file."""
    abs_path = os.path.abspath(request.file_path)
    
    try:
        # Create parent directories if needed
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(request.proposed_content)

        # Trigger auto-indexer update if active
        from app.services.watcher_service import workspace_watcher
        if hasattr(workspace_watcher, "trigger_reindex"):
            workspace_watcher.trigger_reindex()

        return {
            "success": True,
            "message": f"Successfully updated file: {abs_path}",
            "file_path": abs_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply changes: {str(e)}")

@router.get("/file-content")
def get_file_content(file_path: str):
    """Retrieve full content of a workspace file for the File Peek Drawer."""
    clean_path = file_path.strip().lstrip("/")
    abs_path = os.path.abspath(clean_path)
    
    if not os.path.exists(abs_path):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        candidate = os.path.join(project_root, clean_path)
        if os.path.exists(candidate):
            abs_path = candidate

    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        
        lines_count = len(content.splitlines())
        filename = os.path.basename(abs_path)
        ext = os.path.splitext(filename)[1].lstrip(".") or "txt"

        return {
            "file_path": file_path,
            "filename": filename,
            "content": content,
            "lines": lines_count,
            "language": ext,
            "size_bytes": os.path.getsize(abs_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
