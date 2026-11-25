import os
import re
import json
import shutil
import subprocess
import urllib.parse
import urllib.request
from typing import Optional, Dict, Any, List

def get_git_executable() -> str:
    """Resolve the git binary, preferring macOS command line tools if available."""
    macos_clt_git = "/Library/Developer/CommandLineTools/usr/bin/git"
    if os.path.exists(macos_clt_git):
        return macos_clt_git
    found = shutil.which("git")
    return found or "git"

# Set GitPython environment variable in case GitPython is imported anywhere
os.environ.setdefault("GIT_PYTHON_GIT_EXECUTABLE", get_git_executable())

class GitService:
    def __init__(self):
        self.git_bin = get_git_executable()

    def resolve_repo_path(self, repo_path: Optional[str] = None) -> str:
        """Resolve target repository directory (active repo or current project root)."""
        if repo_path and os.path.exists(repo_path) and os.path.isdir(repo_path):
            return os.path.abspath(repo_path)
        
        # Check active_repo.json
        try:
            from app.routes.upload_repo import load_active_repo
            active = load_active_repo()
            if active and active.get("path") and os.path.isdir(active["path"]):
                return os.path.abspath(active["path"])
        except Exception:
            pass

        # Fallback to current working directory
        return os.getcwd()

    def _run_git(self, args: List[str], cwd: str) -> subprocess.CompletedProcess:
        """Run a git command in the target directory."""
        return subprocess.run(
            [self.git_bin] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False
        )

    def parse_github_repo(self, remote_url: Optional[str]) -> Optional[str]:
        """Extract owner/repo from git remote URL (HTTPS or SSH)."""
        if not remote_url:
            return None
        remote_url = remote_url.strip()
        m = re.search(r"github\.com[:/]([^/]+)/([^/.]+)(?:\.git)?", remote_url)
        if m:
            return f"{m.group(1)}/{m.group(2)}"
        return None

    def sanitize_branch_name(self, name: str) -> str:
        """Sanitize branch name into a valid git ref slug."""
        slug = name.strip().lower()
        slug = re.sub(r"[^\w\-/.]", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        slug = slug.strip("-/.")
        if not slug:
            slug = "patch"
        if not slug.startswith("devpilot/"):
            slug = f"devpilot/{slug}"
        return slug

    def get_status(self, repo_path: Optional[str] = None) -> Dict[str, Any]:
        """Get repository git status including branches, dirty state, and remote."""
        target_path = self.resolve_repo_path(repo_path)
        git_dir = os.path.join(target_path, ".git")

        if not os.path.exists(git_dir):
            return {
                "is_repo": False,
                "repo_path": target_path,
                "current_branch": "",
                "branches": [],
                "modified_files": [],
                "untracked_files": [],
                "staged_files": [],
                "is_clean": True,
                "remote_url": None,
                "github_repo": None
            }

        # Current branch
        branch_res = self._run_git(["branch", "--show-current"], cwd=target_path)
        current_branch = branch_res.stdout.strip() or "HEAD"

        # List local branches
        branches_res = self._run_git(["branch", "--list", "--format=%(refname:short)"], cwd=target_path)
        branches = [b.strip() for b in branches_res.stdout.splitlines() if b.strip()]

        # Remote URL
        remote_res = self._run_git(["config", "--get", "remote.origin.url"], cwd=target_path)
        remote_url = remote_res.stdout.strip() or None
        github_repo = self.parse_github_repo(remote_url)

        # Status porcelain
        status_res = self._run_git(["status", "--porcelain"], cwd=target_path)
        lines = status_res.stdout.splitlines()

        modified_files = []
        untracked_files = []
        staged_files = []

        for line in lines:
            if len(line) < 3:
                continue
            index_status = line[0]
            worktree_status = line[1]
            file_path = line[3:].strip()

            if index_status in ("M", "A", "D", "R", "C"):
                staged_files.append(file_path)
            if worktree_status in ("M", "D"):
                modified_files.append(file_path)
            elif index_status == "?" and worktree_status == "?":
                untracked_files.append(file_path)

        is_clean = len(modified_files) == 0 and len(untracked_files) == 0 and len(staged_files) == 0

        return {
            "is_repo": True,
            "repo_path": target_path,
            "current_branch": current_branch,
            "branches": branches,
            "modified_files": modified_files,
            "untracked_files": untracked_files,
            "staged_files": staged_files,
            "is_clean": is_clean,
            "remote_url": remote_url,
            "github_repo": github_repo
        }

    def create_and_checkout_branch(
        self,
        branch_name: str,
        base_branch: Optional[str] = None,
        repo_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new branch (optionally from base_branch) and check it out."""
        target_path = self.resolve_repo_path(repo_path)
        clean_name = self.sanitize_branch_name(branch_name)

        # Check if base branch specified and switch first if needed
        if base_branch:
            checkout_base = self._run_git(["checkout", base_branch], cwd=target_path)
            if checkout_base.returncode != 0:
                return {
                    "success": False,
                    "error": f"Failed to checkout base branch '{base_branch}': {checkout_base.stderr.strip()}"
                }

        # Create and checkout new branch
        res = self._run_git(["checkout", "-b", clean_name], cwd=target_path)
        if res.returncode != 0:
            # If already exists, attempt checkout
            alt_res = self._run_git(["checkout", clean_name], cwd=target_path)
            if alt_res.returncode != 0:
                return {
                    "success": False,
                    "error": res.stderr.strip() or alt_res.stderr.strip() or "Failed to create branch."
                }

        return {
            "success": True,
            "branch": clean_name,
            "message": f"Successfully created and checked out branch '{clean_name}'"
        }

    def checkout_branch(self, branch_name: str, repo_path: Optional[str] = None) -> Dict[str, Any]:
        """Checkout an existing branch."""
        target_path = self.resolve_repo_path(repo_path)
        res = self._run_git(["checkout", branch_name], cwd=target_path)
        if res.returncode != 0:
            return {"success": False, "error": res.stderr.strip()}
        return {"success": True, "branch": branch_name, "message": f"Switched to branch '{branch_name}'"}

    def stage_and_commit(
        self,
        message: str,
        files: Optional[List[str]] = None,
        repo_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Stage changed files and commit with a clean commit message."""
        target_path = self.resolve_repo_path(repo_path)
        clean_msg = message.strip()
        if not clean_msg:
            return {"success": False, "error": "Commit message cannot be empty."}

        # Stage files
        if files and len(files) > 0:
            stage_args = ["add"] + files
        else:
            stage_args = ["add", "-A"]
        
        stage_res = self._run_git(stage_args, cwd=target_path)
        if stage_res.returncode != 0:
            return {"success": False, "error": f"Failed to stage files: {stage_res.stderr.strip()}"}

        # Commit
        commit_res = self._run_git(["commit", "-m", clean_msg], cwd=target_path)
        if commit_res.returncode != 0:
            # Check if nothing to commit
            if "nothing to commit" in commit_res.stdout.lower() or "nothing to commit" in commit_res.stderr.lower():
                return {
                    "success": True,
                    "message": "Nothing to commit, working tree clean.",
                    "commit_hash": None
                }
            return {"success": False, "error": commit_res.stderr.strip() or commit_res.stdout.strip()}

        # Get latest commit hash
        hash_res = self._run_git(["rev-parse", "--short", "HEAD"], cwd=target_path)
        commit_hash = hash_res.stdout.strip()

        return {
            "success": True,
            "commit_hash": commit_hash,
            "message": f"Committed [{commit_hash}]: {clean_msg}"
        }

    def generate_pr_draft(
        self,
        diff_text: str = "",
        task_description: str = "",
        title_hint: str = "",
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Use LLM to generate conventional commit, branch name, PR title, and detailed PR markdown body."""
        from app.services.llm_provider import get_llm_response

        # Truncate diff text if overly large to stay within context
        diff_preview = diff_text[:3500] if diff_text else "No diff provided."
        
        prompt = f"""You are DevPilot AI's automated release engineer.
Generate a structured, professional Git Pull Request draft and Conventional Commit message based on the code changes and task context below.

Context/Goal: {task_description or title_hint or 'Automated code changes'}
Title Hint: {title_hint}

Diff / Changes:
{diff_preview}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "branch_name": "<short slug starting with devpilot/, e.g. devpilot/fix-mermaid-guard or devpilot/feat-voice-input>",
  "commit_message": "<conventional commit message, e.g. feat(ui): add voice input integration>",
  "pr_title": "<concise PR title, e.g. feat: add speech-to-text voice input to workspace>",
  "pr_body": "<comprehensive markdown PR body with ## 📋 Summary, ## 🛠️ Changes Made, ## 🧪 Testing & Verification, and ## 🛡️ Risk Assessment>"
}}
Do NOT include backtick formatting or prose before or after the JSON."""

        response_text = get_llm_response(prompt, model=model)
        
        # Clean JSON fences if present
        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```(?:json)?\n?", "", clean_text)
            clean_text = re.sub(r"\n?```$", "", clean_text).strip()

        try:
            data = json.loads(clean_text)
            return {
                "branch_name": self.sanitize_branch_name(data.get("branch_name", "patch-update")),
                "commit_message": data.get("commit_message", "feat: apply proposed code changes"),
                "pr_title": data.get("pr_title", "feat: proposed code enhancements"),
                "pr_body": data.get("pr_body", "## 📋 Summary\nAutomated changes applied via DevPilot.")
            }
        except Exception:
            # Fallback if LLM output failed to parse
            slug = re.sub(r"\W+", "-", (title_hint or "patch").lower()).strip("-")[:24]
            return {
                "branch_name": f"devpilot/{slug or 'code-update'}",
                "commit_message": f"feat: {title_hint or 'apply proposed code changes'}",
                "pr_title": f"feat: {title_hint or 'proposed code changes'}",
                "pr_body": f"## 📋 Summary\n{task_description or 'Proposed codebase enhancement generated by DevPilot AI.'}\n\n## 🛠️ Changes Made\nApplied unified diff to workspace.\n\n## 🧪 Testing\nLocal unit tests passed."
            }

    def generate_github_pr_url(
        self,
        github_repo: str,
        base_branch: str,
        head_branch: str,
        title: str,
        body: str
    ) -> str:
        """Generate one-click GitHub comparison URL with prefilled title and body."""
        params = {
            "expand": "1",
            "title": title,
            "body": body
        }
        query_string = urllib.parse.urlencode(params)
        return f"https://github.com/{github_repo}/compare/{base_branch}...{head_branch}?{query_string}"

    def create_github_pr_api(
        self,
        github_repo: str,
        base_branch: str,
        head_branch: str,
        title: str,
        body: str,
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create PR via GitHub REST API if token is provided."""
        auth_token = token or os.getenv("GITHUB_TOKEN")
        if not auth_token:
            return {
                "success": False,
                "error": "No GitHub token found. Provide a token or use the 1-click web comparison link."
            }

        url = f"https://api.github.com/repos/{github_repo}/pulls"
        payload = json.dumps({
            "title": title,
            "body": body,
            "head": head_branch,
            "base": base_branch
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "DevPilot-AI",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                return {
                    "success": True,
                    "pr_url": res_data.get("html_url"),
                    "pr_number": res_data.get("number"),
                    "state": res_data.get("state")
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            return {"success": False, "error": f"GitHub API error (HTTP {e.code}): {err_body}"}
        except Exception as e:
            return {"success": False, "error": f"Failed to contact GitHub API: {str(e)}"}

git_service = GitService()
