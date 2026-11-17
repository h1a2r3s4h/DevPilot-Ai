import React, { useState, useEffect } from "react";
import { X, Copy, Check, FileCode, AlertCircle, RefreshCw } from "lucide-react";
import { fetchFileContent, type FileContentResponse } from "../utils/api";

interface FilePeekDrawerProps {
  filePath: string | null;
  onClose: () => void;
}

export const FilePeekDrawer: React.FC<FilePeekDrawerProps> = ({ filePath, onClose }) => {
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchFileContent(filePath)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || `Failed to read file ${filePath}`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && filePath) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filePath, onClose]);

  if (!filePath) return null;

  const handleCopy = () => {
    if (!data?.content) return;
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = data?.content ? data.content.split("\n") : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800/90 shadow-2xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <FileCode size={16} />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono truncate">
                  {data?.filename || filePath.split("/").pop()}
                </span>
                {data && (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-cyan-700 dark:text-cyan-400 uppercase">
                    {data.language}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">{filePath}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors text-xs font-mono shadow-2xs"
                title="Copy entire file"
              >
                {copied ? <Check size={12} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-700/80 shadow-2xs"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* File Meta Sub-bar */}
        {data && (
          <div className="flex items-center justify-between px-5 py-2 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800/60 text-[11px] font-mono text-zinc-500 shrink-0">
            <div className="flex items-center gap-4">
              <span>{data.lines} lines</span>
              <span>{(data.size_bytes / 1024).toFixed(1)} KB</span>
            </div>
            <span className="text-zinc-400 dark:text-zinc-600">Read-Only Ground Truth Inspector</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-300 select-text">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2.5">
              <RefreshCw size={18} className="animate-spin text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs">Reading workspace file...</span>
            </div>
          ) : error ? (
            <div className="p-6 flex flex-col items-center justify-center h-64 text-center text-zinc-600 dark:text-zinc-400 gap-3">
              <AlertCircle size={28} className="text-amber-500 dark:text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Unable to preview file</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div className="min-w-full inline-block py-2">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                      <td className="w-12 px-3 py-0.5 text-right text-[11px] font-mono text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 select-none border-r border-zinc-200 dark:border-zinc-900 shrink-0">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-0.5 whitespace-pre text-[12px] font-mono text-zinc-900 dark:text-zinc-200 font-normal">
                        {line || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
