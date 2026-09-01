import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { RepoManager } from "./components/RepoManager";
import { ChatWindow } from "./components/ChatWindow";
import { ObservabilityDashboard } from "./components/ObservabilityDashboard";
import { fetchRepos } from "./utils/api";

function App() {
  const [activeMode, setActiveMode] = useState<string>("ask");
  const [activeRepoName, setActiveRepoName] = useState<string>("");

  // Statically force dark mode theme classes
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Function to load and determine active repository details
  const updateActiveRepo = async () => {
    try {
      const repos = await fetchRepos();
      const repoNames = Object.keys(repos);
      if (repoNames.length > 0) {
        // Find the last added repo in the registry
        setActiveRepoName(repoNames[repoNames.length - 1]);
      } else {
        setActiveRepoName("No active repo");
      }
    } catch (e) {
      console.warn("Failed to check active repos:", e);
      setActiveRepoName("Backend offline");
    }
  };

  useEffect(() => {
    updateActiveRepo();
  }, []);

  const getModeMeta = () => {
    switch (activeMode) {
      case "ask":
        return { badge: "ASK", subtitle: "RAG RETRIEVAL MODE" };
      case "agent":
        return { badge: "AGENT", subtitle: "MULTI-AGENT ORCHESTRATION" };
      case "repos":
        return { badge: "REPOS", subtitle: "INDEX & MANAGE CODEBASES" };
      case "observability":
        return { badge: "TELEMETRY", subtitle: "SYSTEM MONITORING & LOGS" };
      default:
        return { badge: "", subtitle: "" };
    }
  };

  const { badge, subtitle } = getModeMeta();

  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100 font-sans antialiased dark">
      {/* Dynamic Sidebar navigation */}
      <Sidebar activeMode={activeMode} setActiveMode={setActiveMode} />
      
      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Neon accent background light */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-radial from-cyan-500/5 to-transparent blur-3xl pointer-events-none z-0"></div>

        {/* Sticky Glassmorphic Header */}
        <header className="flex items-center gap-3.5 px-10 h-16 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md z-20 select-none shrink-0 relative">
          <span className="font-heading text-sm font-black text-zinc-100 tracking-tight">DevPilot</span>
          
          <div className="w-[1px] h-3.5 bg-zinc-800" />

          {badge && (
            <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-md tracking-wider">
              {badge}
            </span>
          )}

          {subtitle && (
            <span className="text-[10px] text-zinc-500 font-mono tracking-wide hidden sm:inline">
              {subtitle}
            </span>
          )}

          {activeRepoName && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active:</span>
              <span className="text-cyan-400 font-semibold truncate max-w-xs">{activeRepoName}</span>
            </div>
          )}
        </header>

        {/* Content routing based on mode */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
          {activeMode === "repos" ? (
            <RepoManager onRepoUpdated={updateActiveRepo} />
          ) : activeMode === "observability" ? (
            <ObservabilityDashboard />
          ) : (
            <ChatWindow mode={activeMode as "ask" | "agent"} />
          )}
        </div>
      </main>
    </div>
  );
}


export default App;
