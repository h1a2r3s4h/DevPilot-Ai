import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { AskWorkspace } from "./components/AskWorkspace";
import { AgentWorkspace } from "./components/AgentWorkspace";
import { RepoManager } from "./components/RepoManager";
import { ObservabilityDashboard } from "./components/ObservabilityDashboard";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { fetchRepos, fetchActiveRepo, switchRepo, type RepoRegistry } from "./utils/api";
import { Search, Settings } from "lucide-react";

function MainApp() {
  const [activeMode, setActiveMode] = useState<string>("ask");
  const [activeRepoName, setActiveRepoName] = useState<string>("");
  const [repos, setRepos] = useState<RepoRegistry>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const { toast } = useToast();

  // Load repositories and active repo
  const refreshRepos = async () => {
    try {
      const [registry, active] = await Promise.all([
        fetchRepos().catch(() => ({})),
        fetchActiveRepo().catch(() => null),
      ]);
      setRepos(registry);
      if (active && active.name) {
        setActiveRepoName(active.name);
      } else {
        const repoNames = Object.keys(registry);
        if (repoNames.length > 0) {
          setActiveRepoName(repoNames[0]);
        } else {
          setActiveRepoName("No active repo");
        }
      }
    } catch (e) {
      console.warn("Failed to check active repos:", e);
      setActiveRepoName("Backend offline");
    }
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    refreshRepos();
  }, []);

  // Global Shortcuts (Cmd+K for Command Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSwitchRepo = async (targetPath: string) => {
    try {
      await switchRepo(targetPath);
      toast({ type: "success", title: "Switched Repository", description: `Activated ${targetPath}` });
      await refreshRepos();
    } catch (err: any) {
      toast({ type: "error", title: "Failed to switch repo", description: err.message });
    }
  };

  const getModeMeta = () => {
    switch (activeMode) {
      case "ask":
        return { badge: "ASK", subtitle: "RAG RETRIEVAL & CODE INTELLIGENCE" };
      case "agent":
        return { badge: "AGENT", subtitle: "MULTI-AGENT ORCHESTRATION PIPELINE" };
      case "repos":
        return { badge: "REPOS", subtitle: "INDEX & MANAGE CODEBASES" };
      case "observability":
        return { badge: "TELEMETRY", subtitle: "LIVE SYSTEM MONITORING & LOGS" };
      default:
        return { badge: "", subtitle: "" };
    }
  };

  const { badge, subtitle } = getModeMeta();

  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100 font-sans antialiased dark select-none">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Glow Accent Ambient Background Light */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-radial from-cyan-500/5 to-transparent blur-3xl pointer-events-none z-0 animate-pulse-slow" />

        {/* Global Sticky Header */}
        <header className="flex items-center justify-between px-8 h-14 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md z-20 select-none shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-heading text-sm font-black text-zinc-100 tracking-tight">
              DevPilot
            </span>

            <div className="w-[1px] h-3.5 bg-zinc-800" />

            {badge && (
              <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-md tracking-wider">
                {badge}
              </span>
            )}

            {subtitle && (
              <span className="text-[10px] text-zinc-500 font-mono tracking-wide hidden md:inline">
                {subtitle}
              </span>
            )}
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all font-mono shadow-sm"
              title="Open Command Palette (⌘K)"
            >
              <Search size={13} className="text-zinc-500" />
              <span className="hidden sm:inline">Commands</span>
              <kbd className="px-1.5 py-0.5 text-[9px] bg-zinc-950 border border-zinc-800 rounded text-cyan-400 shadow-2xs font-semibold">
                ⌘K
              </kbd>
            </button>

            {/* Active Repo Pill */}
            {activeRepoName && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-500">Repo:</span>
                <span className="text-cyan-400 font-semibold truncate max-w-[140px]">{activeRepoName}</span>
              </div>
            )}

            {/* Quick Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-zinc-900 transition-colors"
              title="Platform Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Content routing based on mode with smooth animation */}
        <div key={activeMode} className="flex-1 overflow-hidden flex flex-col relative z-10 animate-fade-in">
          {activeMode === "ask" ? (
            <AskWorkspace
              activeRepoName={activeRepoName}
              repos={repos}
              onSwitchRepo={handleSwitchRepo}
            />
          ) : activeMode === "agent" ? (
            <AgentWorkspace activeRepoName={activeRepoName} />
          ) : activeMode === "repos" ? (
            <RepoManager onRepoUpdated={refreshRepos} />
          ) : (
            <ObservabilityDashboard />
          )}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveMode={setActiveMode}
        repos={repos}
        onSwitchRepo={handleSwitchRepo}
        onNewChat={() => {
          setActiveMode("ask");
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeRepo={activeRepoName}
      />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

export default App;
