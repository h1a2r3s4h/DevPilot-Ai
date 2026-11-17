import React, { useEffect, useState } from "react";
import { 
  GitFork, 
  HelpCircle, 
  ListTree, 
  Bug, 
  TestTube, 
  Sparkles, 
  Database,
  ArrowRight
} from "lucide-react";

export interface SlashCommand {
  key: string;
  label: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: "diagram",
    label: "/diagram",
    description: "Generate an architectural workflow flowchart using Mermaid",
    prompt: "Explain the architecture of this codebase, how components interact, and illustrate the request flow with a styled Mermaid diagram.",
    icon: <GitFork size={14} className="text-cyan-400" />,
  },
  {
    key: "explain",
    label: "/explain",
    description: "Deep dive explanation of the codebase structure and responsibilities",
    prompt: "Provide a comprehensive explanation of this project, how modules are organized, and the end-to-end execution flow.",
    icon: <HelpCircle size={14} className="text-emerald-400" />,
  },
  {
    key: "endpoints",
    label: "/endpoints",
    description: "List all API endpoints, request methods, and handlers",
    prompt: "List all API endpoints and routes in this project in a clean markdown table with method, path, and purpose.",
    icon: <ListTree size={14} className="text-blue-400" />,
  },
  {
    key: "find-bug",
    label: "/find-bug",
    description: "Perform a security audit and detect potential bugs or vulnerabilities",
    prompt: "Audit this repository for potential bugs, security vulnerabilities, or error handling edge cases.",
    icon: <Bug size={14} className="text-rose-400" />,
  },
  {
    key: "test",
    label: "/test",
    description: "Generate unit tests and test suites for core business logic",
    prompt: "Generate comprehensive unit tests for key services and endpoints in this repository.",
    icon: <TestTube size={14} className="text-purple-400" />,
  },
  {
    key: "refactor",
    label: "/refactor",
    description: "Suggest clean architecture refactoring and performance optimizations",
    prompt: "Identify opportunities to refactor this codebase for better performance, modularity, and clean code principles.",
    icon: <Sparkles size={14} className="text-amber-400" />,
  },
  {
    key: "database",
    label: "/database",
    description: "Explain vector database storage, indices, and session memory",
    prompt: "Explain how session memory, vector database (FAISS), and cache storage are implemented in this repository.",
    icon: <Database size={14} className="text-cyan-300" />,
  },
];

interface SlashCommandMenuProps {
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  filter,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cleanFilter = filter.replace(/^\//, "").toLowerCase();
  const filtered = SLASH_COMMANDS.filter(
    (c) =>
      c.key.toLowerCase().includes(cleanFilter) ||
      c.description.toLowerCase().includes(cleanFilter)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-lg bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl dark:shadow-2xl backdrop-blur-xl p-1.5 z-40 animate-fade-in-up">
      <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-900 mb-1 flex items-center justify-between">
        <span>Quick Slash Actions</span>
        <span>↑↓ to navigate • ↵ to choose</span>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-0.5">
        {filtered.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={cmd.key}
              type="button"
              onClick={() => onSelect(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors text-xs font-mono ${
                isSelected
                  ? "bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-200"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
                  {cmd.icon}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>{cmd.label}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans truncate">
                    {cmd.description}
                  </div>
                </div>
              </div>

              {isSelected && <ArrowRight size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
