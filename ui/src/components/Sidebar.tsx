import React from "react";
import { 
  MessageSquare, 
  Bot, 
  Database, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Sparkles
} from "lucide-react";

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
    { id: "ask", label: "Ask (RAG)", icon: <MessageSquare size={17} /> },
    { id: "agent", label: "Agent Run", icon: <Bot size={17} /> },
    { id: "repos", label: "Manage Repos", icon: <Database size={17} /> },
    { id: "observability", label: "Observability", icon: <Activity size={17} /> },
  ];

  return (
    <aside 
      className={`h-full bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 ${
        isCollapsed ? "w-16 p-3" : "w-64 p-5"
      }`}
    >
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-sm animate-pulse" />
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 relative z-10 shadow-lg">
                <Sparkles size={18} />
              </div>
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="font-heading text-base font-extrabold text-zinc-100 tracking-tight leading-none truncate">
                  DevPilot
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                  AI Platform v2.0
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
              <ChevronLeft size={16} />
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
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMode(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl font-medium text-xs transition-all duration-200 text-left ${
                  isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5 hover:translate-x-0.5"
                } ${
                  isActive
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/5 font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
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
      <div className="pt-4 border-t border-zinc-900 space-y-2">
        <button
          onClick={onOpenSettings}
          title="Preferences & Settings"
          className={`w-full flex items-center gap-2.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors ${
            isCollapsed ? "justify-center p-2.5" : "px-3 py-2"
          }`}
        >
          <Settings size={15} />
          {!isCollapsed && <span>Settings</span>}
        </button>

        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-900 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway Connected
            </span>
            <span className="text-zinc-600">8000</span>
          </div>
        )}
      </div>
    </aside>
  );
};
