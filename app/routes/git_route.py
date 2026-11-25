import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.services.git_service import git_service

router = APIRouter(prefix="/api/git", tags=["Git & PR Automation"])

class CreateBranchRequest(BaseModel):
    branch_name: str
    base_branch: Optional[str] = None
    repo_path: Optional[str] = None

class CheckoutBranchRequest(BaseModel):
    branch_name: str
    repo_path: Optional[str] = None

class CommitRequest(BaseModel):
    message: str
    files: Optional[List[str]] = None
    repo_path: Optional[str] = None

class DraftPrRequest(BaseModel):
    diff_text: Optional[str] = ""
    task_description: Optional[str] = ""
    title_hint: Optional[str] = ""
    model: Optional[str] = None

class CreatePrRequest(BaseModel):
    github_repo: Optional[str] = None
    base_branch: str = "main"
    head_branch: str
    title: str
    body: str
    token: Optional[str] = None
    create_via_api: Optional[bool] = False

@router.get("/status")
def get_git_status(repo_path: Optional[str] = Query(None)):
    """Fetch current branch, dirty status, branch list, and remote GitHub repository."""
    return git_service.get_status(repo_path)

@router.post("/branch")
def create_branch(req: CreateBranchRequest):
    """Create a new git branch and check it out."""
    res = git_service.create_and_checkout_branch(
        branch_name=req.branch_name,
        base_branch=req.base_branch,
        repo_path=req.repo_path
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to create branch"))
    return res

@router.post("/checkout")
def checkout_branch(req: CheckoutBranchRequest):
    """Checkout an existing git branch."""
    res = git_service.checkout_branch(
        branch_name=req.branch_name,
        repo_path=req.repo_path
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to switch branch"))
    return res

@router.post("/commit")
def commit_changes(req: CommitRequest):
    """Stage and commit changes to the active branch."""
    res = git_service.stage_and_commit(
        message=req.message,
        files=req.files,
        repo_path=req.repo_path
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to commit changes"))
    return res

@router.post("/draft-pr")
def draft_pr(req: DraftPrRequest):
    """Generate AI-powered conventional commit, branch name, PR title, and markdown body."""
    try:
        return git_service.generate_pr_draft(
            diff_text=req.diff_text or "",
            task_description=req.task_description or "",
            title_hint=req.title_hint or "",
            model=req.model
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PR draft: {str(e)}")

@router.post("/create-pr")
def create_pr(req: CreatePrRequest):
    """Generate 1-click GitHub compare URL or create PR via GitHub API."""
    # If github_repo not provided, resolve from active repo status
    github_repo = req.github_repo
    if not github_repo:
        status = git_service.get_status()
        github_repo = status.get("github_repo")
    
    if not github_repo:
        raise HTTPException(
            status_code=400,
            detail="Could not detect GitHub repository (e.g. 'owner/repo'). Check remote.origin.url or specify github_repo."
        )

    web_url = git_service.generate_github_pr_url(
        github_repo=github_repo,
        base_branch=req.base_branch,
        head_branch=req.head_branch,
        title=req.title,
        body=req.body
    )

    api_result = None
    if req.create_via_api:
        api_result = git_service.create_github_pr_api(
            github_repo=github_repo,
            base_branch=req.base_branch,
            head_branch=req.head_branch,
            title=req.title,
            body=req.body,
            token=req.token
        )

    return {
        "success": True,
        "github_repo": github_repo,
        "web_compare_url": web_url,
        "api_result": api_result
    }
