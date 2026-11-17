import React, { useState, useEffect } from "react";
import { 
  fetchReposDetails, 
  fetchActiveRepo, 
  switchRepo, 
  indexLocalRepo, 
  cloneAndIndexGithub, 
  deleteRepo,
  type RepoDetail 
} from "../utils/api";
import { 
  FolderPlus, 
  RefreshCw, 
  GitBranch, 
  Trash2, 
  Search, 
  Database, 
  FileCode, 
  Layers, 
  Check
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./ui/Toast";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface RepoManagerProps {
  onRepoUpdated: () => void;
}

export const RepoManager: React.FC<RepoManagerProps> = ({ onRepoUpdated }) => {
  const { toast } = useToast();
  const [details, setDetails] = useState<RepoDetail[]>([]);
  const [activeRepoPath, setActiveRepoPath] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [localPath, setLocalPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "add_local" | "add_github">("all");

  const [repoToDelete, setRepoToDelete] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [active, detailData] = await Promise.all([
        fetchActiveRepo().catch(() => null),
        fetchReposDetails().catch(() => ({ repositories: [], total: 0 })),
      ]);
      setDetails(detailData.repositories || []);
      if (active && active.path) {
        setActiveRepoPath(active.path);
      }
    } catch (e) {
      console.error("Failed to load repo data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIndexLocal = async () => {
    if (!localPath.trim()) {
      toast({ type: "warning", title: "Path Required", description: "Enter a valid local folder path" });
      return;
    }
    setLoading(true);
    setLoadingStep("Traversing AST nodes & building hybrid FAISS + BM25 index...");
    try {
      const res = await indexLocalRepo(localPath.trim());
      if (res.error) {
        toast({ type: "error", title: "Indexing Failed", description: res.error });
      } else {
        toast({
          type: "success",
          title: "Codebase Indexed",
          description: `Successfully indexed ${res.chunks_added} code chunks into vector store`,
        });
        setLocalPath("");
        setActiveTab("all");
        await loadData();
        onRepoUpdated();
      }
    } catch (err: any) {
      toast({ type: "error", title: "Indexing Error", description: err.message || "Failed to index repo" });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleIndexGithub = async () => {
    if (!githubUrl.trim()) {
      toast({ type: "warning", title: "URL Required", description: "Provide a valid public GitHub URL" });
      return;
    }
    setLoading(true);
    setLoadingStep("Cloning Git repository & generating embeddings...");
    try {
      const res = await cloneAndIndexGithub(githubUrl.trim());
      if (res.error) {
        toast({ type: "error", title: "Clone Error", description: res.error });
      } else {
        toast({
          type: "success",
          title: "GitHub Repository Indexed",
          description: `Added ${res.chunks_added} chunks to knowledge index`,
        });
        setGithubUrl("");
        setActiveTab("all");
        await loadData();
        onRepoUpdated();
      }
    } catch (err: any) {
      toast({ type: "error", title: "Clone Error", description: err.message || "Failed to clone GitHub repo" });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleSwitchRepo = async (targetPath: string) => {
    setLoading(true);
    setLoadingStep("Loading cached index into active hybrid retriever...");
    try {
      const res = await switchRepo(targetPath);
      toast({
        type: "success",
        title: "Workspace Switched",
        description: res.message || "Active repository switched successfully",
      });
      await loadData();
      onRepoUpdated();
    } catch (err: any) {
      toast({ type: "error", title: "Switch Failed", description: err.message || "Could not switch repo" });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleConfirmDelete = async () => {
    if (!repoToDelete) return;
    try {
      await deleteRepo(repoToDelete);
      toast({ type: "info", title: "Repository Removed", description: `Removed '${repoToDelete}' from registry` });
      setRepoToDelete(null);
      await loadData();
      onRepoUpdated();
    } catch (err: any) {
      toast({ type: "error", title: "Delete Error", description: err.message || "Failed to delete repo" });
    }
  };

  const filteredDetails = details.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalChunks = details.reduce((acc, curr) => acc + (curr.chunks_count || 0), 0);
  const totalFiles = details.reduce((acc, curr) => acc + (curr.file_count || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950 overflow-y-auto p-8 gap-6 animate-fade-in transition-colors duration-300">
      {/* Top Banner & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <Database className="text-cyan-600 dark:text-cyan-400" size={24} />
            <h1 className="text-xl font-heading font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Repository Management & Vector Store
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            Index, cache, and ground RAG search and multi-agent operations in your local or remote codebases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setActiveTab(activeTab === "add_local" ? "all" : "add_local")}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm active:scale-95 transition-all"
          >
            <FolderPlus size={13} className="mr-1.5" />
            Add Local Repo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab(activeTab === "add_github" ? "all" : "add_github")}
            className="text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 shadow-2xs"
          >
            <GitBranch size={13} className="mr-1.5" />
            Connect GitHub
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
            <Database size={18} />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Total Repositories
            </div>
            <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              {details.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Total Chunks Indexed
            </div>
            <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              {totalChunks.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
            <FileCode size={18} />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Analyzed Code Files
            </div>
            <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              {totalFiles.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Live Indexing Progress Indicator */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-400 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300 text-xs font-mono animate-pulse shadow-sm">
          <RefreshCw size={15} className="animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>{loadingStep || "Indexing repository..."}</span>
        </div>
      )}

      {/* Add Local Repo Modal Form */}
      {activeTab === "add_local" && (
        <div className="rounded-2xl border border-cyan-400 dark:border-cyan-500/30 bg-white dark:bg-zinc-900/70 p-6 space-y-4 animate-scale-in shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus size={16} className="text-cyan-600 dark:text-cyan-400" />
              Index Local Filesystem Repository
            </h3>
            <button
              onClick={() => setActiveTab("all")}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans">
            Specify the absolute path or relative path to your project. Supports Python, TypeScript, React, HTML, CSS, Markdown, and JSON.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="e.g. . or /Users/username/my-project"
              className="font-mono text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 focus:border-cyan-500/60"
              disabled={loading}
            />
            <Button
              onClick={handleIndexLocal}
              disabled={loading || !localPath.trim()}
              className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs active:scale-95 transition-all shadow-sm"
            >
              Start Indexing
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span>Quick preset:</span>
            <button
              onClick={() => setLocalPath(".")}
              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shadow-2xs"
            >
              Current Directory (.)
            </button>
          </div>
        </div>
      )}

      {/* Connect GitHub Repo Modal Form */}
      {activeTab === "add_github" && (
        <div className="rounded-2xl border border-cyan-400 dark:border-cyan-500/30 bg-white dark:bg-zinc-900/70 p-6 space-y-4 animate-scale-in shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <GitBranch size={16} className="text-cyan-600 dark:text-cyan-400" />
              Clone & Index Public GitHub Repository
            </h3>
            <button
              onClick={() => setActiveTab("all")}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans">
            Clone shallow git depth into isolated repository storage and automatically build vector embeddings.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/fastapi/fastapi"
              className="font-mono text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 focus:border-cyan-500/60"
              disabled={loading}
            />
            <Button
              onClick={handleIndexGithub}
              disabled={loading || !githubUrl.trim()}
              className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs active:scale-95 transition-all shadow-sm"
            >
              Clone & Index
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter repositories by name or path..."
            className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-cyan-500 outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Repositories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDetails.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 text-zinc-500 font-mono text-xs space-y-3">
            <Database size={32} className="mx-auto text-zinc-400 dark:text-zinc-600 mb-2" />
            <div>No matching repositories found.</div>
            <Button
              size="sm"
              onClick={() => {
                setLocalPath(".");
                setActiveTab("add_local");
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-sm"
            >
              Index Current Project (.)
            </Button>
          </div>
        ) : (
          filteredDetails.map((repo) => {
            const isActive = repo.path === activeRepoPath;
            return (
              <div
                key={repo.name}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 backdrop-blur-sm ${
                  isActive
                    ? "bg-cyan-50/70 dark:bg-cyan-500/5 border-cyan-400 dark:border-cyan-500/40 shadow-md ring-1 ring-cyan-500/20"
                    : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 hover:border-cyan-400 dark:hover:border-zinc-700/80 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                        <GitBranch size={16} />
                      </div>
                      <h3 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {repo.name}
                      </h3>
                    </div>

                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/40 px-2 py-0.5 rounded-full shrink-0">
                        <Check size={10} /> ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => setRepoToDelete(repo.name)}
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Remove repository"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-zinc-500 truncate mb-4" title={repo.path}>
                    {repo.path}
                  </p>

                  {/* Metadata Stats */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800/60 pt-3">
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500">Files:</span>{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">{repo.file_count || 0}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500">Chunks:</span>{" "}
                      <strong className="text-cyan-600 dark:text-cyan-400">{repo.chunks_count || "Cached"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500">Size:</span>{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">{repo.size_kb} KB</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500">Status:</span>{" "}
                      <strong className={repo.exists ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>
                        {repo.exists ? "Ready" : "Missing"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800/60">
                  {isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchRepo(repo.path)}
                      disabled={loading}
                      className="w-full text-xs border-cyan-400 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 shadow-2xs"
                    >
                      <RefreshCw size={12} className="mr-1.5" />
                      Re-Sync / Reindex
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSwitchRepo(repo.path)}
                      disabled={loading}
                      className="w-full text-xs bg-zinc-100 hover:bg-cyan-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-cyan-500 dark:hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 font-medium transition-all shadow-2xs"
                    >
                      Activate Workspace
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(repoToDelete)}
        title="Remove Repository"
        description={`Are you sure you want to remove '${repoToDelete}' from DevPilot's registered repositories? This will clear its associated vector index cache.`}
        confirmText="Remove Repository"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRepoToDelete(null)}
      />
    </div>
  );
};
