import React, { useState, useEffect } from "react";
import { previewDiff, applyDiff } from "../utils/api";
import type { DiffPreviewResponse } from "../utils/api";
import { Check, X, FileCode, Play, AlertCircle, RefreshCw, Copy, Download, GitPullRequest } from "lucide-react";
import { GitBranchPrModal } from "./GitBranchPrModal";

interface DiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilePath?: string;
  proposedCode: string;
}

export const DiffPreviewModal: React.FC<DiffPreviewModalProps> = ({
  isOpen,
  onClose,
  initialFilePath = "",
  proposedCode,
}) => {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [diffData, setDiffData] = useState<DiffPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  const handleCopyPatch = () => {
    if (!diffData?.diff) return;
    navigator.clipboard.writeText(diffData.diff);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const handleDownloadPatch = () => {
    if (!diffData?.diff) return;
    const blob = new Blob([diffData.diff], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devpilot-${(diffData.filename || "change").replace(/[/\\?%*:|"<>]/g, "_")}.patch`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setFilePath(initialFilePath);
    setStatusMessage(null);
    if (isOpen && proposedCode) {
      handlePreview(initialFilePath);
    }
  }, [isOpen, initialFilePath, proposedCode]);

  const handlePreview = async (path: string) => {
    if (!path.trim()) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await previewDiff(path, proposedCode);
      setDiffData(res);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load git diff" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!filePath.trim()) return;
    setApplying(true);
    setStatusMessage(null);
    try {
      const res = await applyDiff(filePath, proposedCode);
      setStatusMessage({ type: "success", text: res.message });
      // Re-fetch preview to update diff
      handlePreview(filePath);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to apply changes" });
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/90 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-zinc-900 dark:text-zinc-100 overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">Git Diff Preview & File Apply</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">Inspect code changes and apply them directly to local disk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">

          {/* File path input */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 min-w-max font-mono">Target File:</label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. app/routes/stream.py or ui/src/App.tsx"
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-mono shadow-2xs"
            />
            <button
              onClick={() => handlePreview(filePath)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-mono transition-colors border border-zinc-200 dark:border-zinc-800 hover:border-cyan-400 dark:hover:border-cyan-500/30 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""}`} />
              <span>Refresh Diff</span>
            </button>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium font-mono ${statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300"
                }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Unified Diff Viewer */}
          <div className="border border-zinc-800/80 rounded-xl bg-zinc-950 overflow-hidden font-mono text-xs leading-relaxed shadow-lg">
            <div className="bg-zinc-900/80 px-4 py-2.5 text-zinc-400 border-b border-zinc-800 text-[11px] font-mono flex items-center justify-between">
              <span className="text-zinc-200 font-semibold">{diffData?.filename || "Unified Git Diff"}</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-cyan-400">
                  {diffData?.exists ? "Existing File" : "New File"}
                </span>
                {diffData?.diff && (
                  <>
                    <button
                      onClick={handleCopyPatch}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition-colors"
                      title="Copy unified diff as git patch"
                    >
                      {copiedPatch ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedPatch ? "Copied" : "Copy Patch"}</span>
                    </button>
                    <button
                      onClick={handleDownloadPatch}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-cyan-400 transition-colors"
                      title="Download .patch file to apply with `git apply`"
                    >
                      <Download size={11} />
                      <span>Download .patch</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 overflow-x-auto max-h-[50vh]">
              {loading ? (
                <div className="text-zinc-500 py-8 text-center animate-pulse font-mono text-xs">
                  Analyzing repository & generating diff...
                </div>
              ) : diffData?.diff ? (
                <pre className="whitespace-pre font-mono text-[12px] leading-relaxed">
                  {diffData.diff.split("\n").map((line, i) => {
                    let style = "text-zinc-400";
                    if (line.startsWith("+") && !line.startsWith("+++")) {
                      style = "bg-emerald-950/50 text-emerald-300 font-medium px-1 rounded-sm";
                    } else if (line.startsWith("-") && !line.startsWith("---")) {
                      style = "bg-rose-950/50 text-rose-300 font-medium px-1 rounded-sm";
                    } else if (line.startsWith("@@")) {
                      style = "text-cyan-400 font-semibold bg-zinc-900 px-1 rounded-sm";
                    }
                    return (
                      <div key={i} className={style}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              ) : (
                <div className="text-zinc-500 py-8 text-center font-mono text-xs">
                  Enter a target file path above to view unified git diff.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/90">
          <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            Use <code className="text-cyan-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">git apply &lt;file&gt;.patch</code> to stage changes
          </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setIsGitModalOpen(true)}
                disabled={!filePath.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-xl transition-all font-mono disabled:opacity-40"
                title="Create isolated branch and open GitHub PR for these changes"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Create Branch & PR</span>
              </button>
              <button
                onClick={handleApply}
                disabled={applying || !filePath.trim()}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-zinc-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40"
              >
                {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>Apply to Workspace File</span>
              </button>
            </div>
          </div>

        </div>

        {/* Embedded Git Branch & PR Automation Modal */}
        <GitBranchPrModal
          isOpen={isGitModalOpen}
          onClose={() => setIsGitModalOpen(false)}
          initialDiffText={diffData?.diff || proposedCode}
          initialTitleHint={filePath ? `update ${filePath}` : "code change"}
          initialTaskDescription={filePath ? `Proposed modification to ${filePath}` : "Code modification"}
          stagedFiles={filePath ? [filePath] : []}
        />
      </div>
      );
};
