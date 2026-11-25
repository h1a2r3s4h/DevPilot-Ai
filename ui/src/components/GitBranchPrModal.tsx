import React, { useState, useEffect } from "react";
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  ExternalLink,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  Sparkles,
  X,
  ShieldCheck,
  CheckCircle2,
  FolderGit2
} from "lucide-react";
import {
  fetchGitStatus,
  createGitBranch,
  commitGitChanges,
  generateGitPrDraft,
  createGitPr,
  type GitStatusResponse
} from "../utils/api";

interface GitBranchPrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDiffText?: string;
  initialTaskDescription?: string;
  initialTitleHint?: string;
  stagedFiles?: string[];
}

export const GitBranchPrModal: React.FC<GitBranchPrModalProps> = ({
  isOpen,
  onClose,
  initialDiffText = "",
  initialTaskDescription = "",
  initialTitleHint = "",
  stagedFiles = []
}) => {
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Form states
  const [baseBranch, setBaseBranch] = useState("main");
  const [newBranch, setNewBranch] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [useApiDirectly, setUseApiDirectly] = useState(false);

  // Operation states
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [executingBranchCommit, setExecutingBranchCommit] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [copiedPrBody, setCopiedPrBody] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [createdBranchSuccess, setCreatedBranchSuccess] = useState<string | null>(null);
  const [lastPrUrl, setLastPrUrl] = useState<string | null>(null);

  // Load Git status whenever modal opens
  useEffect(() => {
    if (isOpen) {
      loadGitStatus();
      if (!prTitle && initialTitleHint) {
        setPrTitle(initialTitleHint);
      }
      if (!newBranch) {
        const slug = (initialTitleHint || "patch").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
        setNewBranch(`devpilot/${slug || "code-update"}`);
      }
      if (!commitMessage && initialTitleHint) {
        setCommitMessage(`feat: ${initialTitleHint}`);
      }
    }
  }, [isOpen]);

  const loadGitStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await fetchGitStatus();
      setGitStatus(status);
      if (status.current_branch) {
        setBaseBranch(status.current_branch);
      }
    } catch (err: any) {
      setStatusAlert({ type: "error", message: err.message || "Failed to load git status" });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    setGeneratingDraft(true);
    setStatusAlert(null);
    try {
      const draft = await generateGitPrDraft(
        initialDiffText,
        initialTaskDescription,
        prTitle || initialTitleHint
      );
      if (draft.branch_name) setNewBranch(draft.branch_name);
      if (draft.commit_message) setCommitMessage(draft.commit_message);
      if (draft.pr_title) setPrTitle(draft.pr_title);
      if (draft.pr_body) setPrBody(draft.pr_body);
      setStatusAlert({ type: "success", message: "AI generated branch name, commit message, and PR description." });
    } catch (err: any) {
      setStatusAlert({ type: "error", message: err.message || "Failed to generate AI draft" });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleCreateBranchAndCommit = async () => {
    if (!newBranch.trim()) {
      setStatusAlert({ type: "error", message: "Please specify a valid target branch name." });
      return;
    }
    if (!commitMessage.trim()) {
      setStatusAlert({ type: "error", message: "Please specify a commit message." });
      return;
    }

    setExecutingBranchCommit(true);
    setStatusAlert(null);
    try {
      // 1. Create and checkout branch
      const branchRes = await createGitBranch(newBranch.trim(), baseBranch);
      setCreatedBranchSuccess(branchRes.branch);

      // 2. Commit changes
      const commitRes = await commitGitChanges(
        commitMessage.trim(),
        stagedFiles.length > 0 ? stagedFiles : undefined
      );

      setStatusAlert({
        type: "success",
        message: `Switched to '${branchRes.branch}' and committed changes [${commitRes.commit_hash || "HEAD"}]. Ready for PR!`
      });

      // Refresh git status
      await loadGitStatus();
    } catch (err: any) {
      setStatusAlert({ type: "error", message: err.message || "Branch/Commit execution failed" });
    } finally {
      setExecutingBranchCommit(false);
    }
  };

  const handleOpenGithubPr = async () => {
    if (!prTitle.trim()) {
      setStatusAlert({ type: "error", message: "Please provide a PR title." });
      return;
    }

    const headBranch = createdBranchSuccess || newBranch.trim();
    setCreatingPr(true);
    setStatusAlert(null);

    try {
      const res = await createGitPr({
        github_repo: gitStatus?.github_repo || undefined,
        base_branch: baseBranch,
        head_branch: headBranch,
        title: prTitle.trim(),
        body: prBody.trim() || `## 📋 Summary\n${commitMessage || "Automated code updates generated by DevPilot AI."}`,
        token: useApiDirectly && githubToken.trim() ? githubToken.trim() : undefined,
        create_via_api: useApiDirectly && !!githubToken.trim()
      });

      if (res.api_result?.pr_url) {
        setLastPrUrl(res.api_result.pr_url);
        window.open(res.api_result.pr_url, "_blank");
        setStatusAlert({
          type: "success",
          message: `PR #${res.api_result.pr_number} successfully created on GitHub!`
        });
      } else if (res.web_compare_url) {
        setLastPrUrl(res.web_compare_url);
        window.open(res.web_compare_url, "_blank");
        setStatusAlert({
          type: "success",
          message: "Opening pre-filled GitHub Pull Request compare view in your browser..."
        });
      }
    } catch (err: any) {
      setStatusAlert({ type: "error", message: err.message || "Failed to launch GitHub PR" });
    } finally {
      setCreatingPr(false);
    }
  };

  const handleCopyPrMarkdown = () => {
    if (!prBody) return;
    navigator.clipboard.writeText(prBody);
    setCopiedPrBody(true);
    setTimeout(() => setCopiedPrBody(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-zinc-100 overflow-hidden relative">

        {/* Glow ambient background lights */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/80 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <GitPullRequest size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 font-heading">
                  Git Branch & PR Automation
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-semibold">
                  1-CLICK RELEASE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Isolate agent code modifications onto a dedicated branch, commit changes, and open a verified GitHub PR.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Git Repository Context Bar */}
        <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between text-xs font-mono relative z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Current Branch:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-cyan-300 font-semibold flex items-center gap-1">
                <GitBranch size={12} />
                {gitStatus?.current_branch || "detecting..."}
              </span>
            </div>

            {gitStatus?.github_repo && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">GitHub Remote:</span>
                <span className="text-zinc-300 font-semibold flex items-center gap-1 hover:text-cyan-400 transition-colors">
                  <FolderGit2 size={12} className="text-cyan-400" />
                  {gitStatus.github_repo}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={loadGitStatus}
            disabled={loadingStatus}
            title="Refresh Git Status"
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw size={13} className={loadingStatus ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs font-sans relative z-10">

          {/* Status Alert */}
          {statusAlert && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-mono ${statusAlert.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
                  : statusAlert.type === "error"
                    ? "bg-rose-950/40 border border-rose-500/40 text-rose-300"
                    : "bg-cyan-950/40 border border-cyan-500/40 text-cyan-300"
                }`}
            >
              {statusAlert.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : statusAlert.type === "error" ? (
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
              ) : (
                <ShieldCheck size={16} className="text-cyan-400 shrink-0" />
              )}
              <span className="flex-1 leading-relaxed">{statusAlert.message}</span>
              {lastPrUrl && (
                <a
                  href={lastPrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] underline text-cyan-400 hover:text-cyan-300 ml-2"
                >
                  <span>Open PR</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {/* AI PR Generation Action Bar */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-zinc-900/60 to-zinc-900/30 border border-cyan-500/20 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-xs">
                <Sparkles size={14} className="text-cyan-400" />
                AI Release Engineer
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Automatically generate conventional commit syntax, branch slug, and comprehensive PR documentation from diff analysis.
              </p>
            </div>
            <button
              onClick={handleGenerateAiDraft}
              disabled={generatingDraft}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-semibold transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw size={13} className={generatingDraft ? "animate-spin text-cyan-400" : ""} />
              <span>{generatingDraft ? "Synthesizing..." : "Generate AI Draft"}</span>
            </button>
          </div>

          {/* Section 1: Branch & Commit Isolation */}
          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <h4 className="font-heading font-semibold text-zinc-200 text-xs flex items-center gap-2">
              <GitBranch size={14} className="text-cyan-400" />
              1. Branch & Commit Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Base Branch</label>
                <input
                  type="text"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">New Isolated Branch</label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="devpilot/fix-feature-name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Quick slug tags */}
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
              <span className="text-zinc-500">Quick prefix:</span>
              {["fix-", "feat-", "refactor-", "perf-"].map((prefix) => (
                <button
                  key={prefix}
                  onClick={() => {
                    const clean = newBranch.replace(/^devpilot\/(fix|feat|refactor|perf)-?/, "");
                    setNewBranch(`devpilot/${prefix}${clean || "patch"}`);
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  +{prefix}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Conventional Commit Message</label>
              <div className="relative">
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="feat(ui): implement automated branch and PR flow"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 pl-8 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                />
                <GitCommit size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleCreateBranchAndCommit}
                disabled={executingBranchCommit || !newBranch.trim() || !commitMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-cyan-500/50 text-xs font-semibold font-mono transition-all disabled:opacity-40"
              >
                {executingBranchCommit ? (
                  <RefreshCw size={13} className="animate-spin text-cyan-400" />
                ) : (
                  <GitBranch size={13} className="text-cyan-400" />
                )}
                <span>Checkout Branch & Commit Changes</span>
              </button>
            </div>
          </div>

          {/* Section 2: Pull Request Documentation */}
          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-zinc-200 text-xs flex items-center gap-2">
                <GitPullRequest size={14} className="text-cyan-400" />
                2. Pull Request Details
              </h4>
              {prBody && (
                <button
                  onClick={handleCopyPrMarkdown}
                  className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copiedPrBody ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedPrBody ? "Copied" : "Copy Markdown"}</span>
                </button>
              )}
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 mb-1 block">PR Title</label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="feat: automated branch creation and PR generator"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-sans focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 mb-1 block">PR Body (Markdown)</label>
              <textarea
                rows={7}
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                placeholder="## 📋 Summary&#10;Describe changes and purpose...&#10;&#10;## 🧪 Test Plan&#10;How this was verified..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Optional direct GitHub API token checkbox */}
            <div className="pt-2 border-t border-zinc-800/50">
              <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useApiDirectly}
                  onChange={(e) => setUseApiDirectly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                />
                <span>Create PR directly via GitHub API (requires GitHub Personal Access Token)</span>
              </label>

              {useApiDirectly && (
                <div className="mt-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/90 relative z-10 shrink-0">
          <div className="text-[11px] font-mono text-zinc-500 hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Target: <code className="text-cyan-400">{baseBranch} &larr; {createdBranchSuccess || newBranch || "branch"}</code></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleOpenGithubPr}
              disabled={creatingPr || !prTitle.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all font-heading disabled:opacity-40"
            >
              {creatingPr ? (
                <RefreshCw size={14} className="animate-spin text-zinc-950" />
              ) : (
                <ExternalLink size={14} />
              )}
              <span>{useApiDirectly && githubToken ? "Create PR via API" : "Open GitHub PR (1-Click)"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
