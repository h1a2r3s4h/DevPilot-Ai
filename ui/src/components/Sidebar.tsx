import React from "react";
import { 
  Code2, 
  Workflow, 
  FolderGit2, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  ShieldCheck
} from "lucide-react";
import { DevPilotMark } from "./DevPilotMark";

interface SidebarProps {
  activeMode: string;
  setActiveMode: (mode: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeMode, 
  setActiveMode,
  isCollapsed,
  setIsCollapsed,
  onOpenSettings
}) => {
  const navItems = [
    { id: "ask", label: "Code Intelligence", icon: <Code2 size={16} /> },
    { id: "agent", label: "Agent Pipelines", icon: <Workflow size={16} /> },
    { id: "repos", label: "Repositories", icon: <FolderGit2 size={16} /> },
    { id: "observability", label: "Telemetry & Logs", icon: <Activity size={16} /> },
  ];

  return (
    <aside 
      className={`h-full bg-zinc-950/95 border-r border-zinc-900/80 flex flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 relative backdrop-blur-xl ${
        isCollapsed ? "w-16 p-3" : "w-64 p-5"
      }`}
    >
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm relative group hover:border-cyan-500/50 transition-colors">
              <DevPilotMark size={18} className="text-cyan-400" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-heading text-sm font-bold text-zinc-100 tracking-tight leading-none truncate">
                    DevPilot
                  </h2>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wide mt-1 block">
                  Autonomous Runtime
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setIsCollapsed(false)}
              className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMode(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl font-medium text-xs transition-all duration-150 text-left ${
                  isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                } ${
                  isActive
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm font-semibold text-cyan-400"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <div className={`shrink-0 ${isActive ? "text-cyan-400" : "text-zinc-500"}`}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Preferences and API Links */}
      <div className="pt-4 border-t border-zinc-900/90 space-y-2">
        <button
          onClick={onOpenSettings}
          title="Platform Preferences"
          className={`w-full flex items-center gap-2.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 transition-colors ${
            isCollapsed ? "justify-center p-2.5" : "px-3 py-2"
          }`}
        >
          <Settings size={15} />
          {!isCollapsed && <span>Settings & Sandbox</span>}
        </button>

        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-900 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Sandbox Isolated</span>
            </span>
            <span className="text-zinc-600 font-mono">PORT 8000</span>
          </div>
        )}
      </div>
    </aside>
  );
};
