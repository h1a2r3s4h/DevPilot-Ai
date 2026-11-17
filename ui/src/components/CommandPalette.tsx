import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  MessageSquare, 
  Bot, 
  Database, 
  Activity, 
  Settings, 
  PlusCircle, 
  ArrowRight,
  GitBranch
} from "lucide-react";
import type { RepoRegistry } from "../utils/api";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveMode: (mode: string) => void;
  repos: RepoRegistry;
  onSwitchRepo: (path: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveMode,
  repos,
  onSwitchRepo,
  onNewChat,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseCommands = [
    {
      id: "nav-ask",
      title: "Ask (RAG) Coding Assistant",
      category: "Navigation",
      icon: <MessageSquare size={15} className="text-cyan-400" />,
      action: () => { setActiveMode("ask"); onClose(); },
    },
    {
      id: "nav-agent",
      title: "Multi-Agent Orchestration Run",
      category: "Navigation",
      icon: <Bot size={15} className="text-cyan-400" />,
      action: () => { setActiveMode("agent"); onClose(); },
    },
    {
      id: "nav-repos",
      title: "Manage & Index Repositories",
      category: "Navigation",
      icon: <Database size={15} className="text-cyan-400" />,
      action: () => { setActiveMode("repos"); onClose(); },
    },
    {
      id: "nav-obs",
      title: "System Observability & Telemetry",
      category: "Navigation",
      icon: <Activity size={15} className="text-cyan-400" />,
      action: () => { setActiveMode("observability"); onClose(); },
    },
    {
      id: "action-new-chat",
      title: "New Conversation Session",
      category: "Actions",
      icon: <PlusCircle size={15} className="text-emerald-400" />,
      action: () => { onNewChat(); onClose(); },
    },
    {
      id: "action-settings",
      title: "Platform Preferences & Settings",
      category: "Actions",
      icon: <Settings size={15} className="text-zinc-400" />,
      action: () => { onOpenSettings(); onClose(); },
    },
  ];

  const repoCommands = Object.keys(repos).map((repoName) => ({
    id: `repo-${repoName}`,
    title: `Switch Workspace: ${repoName}`,
    category: "Switch Repository",
    icon: <GitBranch size={15} className="text-sky-400" />,
    action: () => { onSwitchRepo(repos[repoName]); onClose(); },
  }));

  const allCommands = [...baseCommands, ...repoCommands];

  const filtered = allCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-900 bg-zinc-950/90">
          <Search size={18} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace... (Esc to close)"
            className="flex-1 bg-transparent border-0 outline-none text-zinc-100 text-sm placeholder:text-zinc-600 font-sans"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No matching commands or repositories found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? "bg-cyan-500/10 text-cyan-200 border border-cyan-500/20 font-medium"
                      : "text-zinc-300 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{item.icon}</div>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={13} className="text-cyan-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-900 bg-zinc-900/20 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>DevPilot Global Navigator</div>
        </div>
      </div>
    </div>
  );
};
