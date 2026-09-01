import React, { useState, useEffect } from "react";
import { previewDiff, applyDiff } from "../utils/api";
import type { DiffPreviewResponse } from "../utils/api";
import { Check, X, FileCode, Play, AlertCircle, RefreshCw } from "lucide-react";

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
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-500/10 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-100">Git Diff Preview & File Apply</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* File path input */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-300 min-w-max">Target File Path:</label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. app/services/rag_service.py or ui/src/App.tsx"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={() => handlePreview(filePath)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Diff
            </button>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                  : "bg-red-950/60 border border-red-500/40 text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              {statusMessage.text}
            </div>
          )}

          {/* Unified Diff Viewer */}
          <div className="border border-slate-800 rounded-lg bg-slate-950 overflow-hidden font-mono text-xs leading-relaxed">
            <div className="bg-slate-900/60 px-4 py-2 text-slate-400 border-b border-slate-800 flex justify-between">
              <span>{diffData?.filename || "Unified Git Diff"}</span>
              <span>{diffData?.exists ? "Existing File" : "New File"}</span>
            </div>

            <div className="p-4 overflow-x-auto max-h-[50vh]">
              {loading ? (
                <div className="text-slate-500 py-8 text-center animate-pulse">Generating Unified Diff...</div>
              ) : diffData?.diff ? (
                <pre className="whitespace-pre">
                  {diffData.diff.split("\n").map((line, i) => {
                    let style = "text-slate-400";
                    if (line.startsWith("+") && !line.startsWith("+++")) {
                      style = "bg-emerald-950/60 text-emerald-300 font-medium px-1";
                    } else if (line.startsWith("-") && !line.startsWith("---")) {
                      style = "bg-red-950/60 text-red-300 font-medium px-1";
                    } else if (line.startsWith("@@")) {
                      style = "text-cyan-400 font-semibold bg-slate-900/80 px-1";
                    }
                    return (
                      <div key={i} className={style}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              ) : (
                <div className="text-slate-500 py-8 text-center">
                  Enter a target file path above to view unified git diff.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !filePath.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            Apply to Workspace File
          </button>
        </div>

      </div>
    </div>
  );
};
