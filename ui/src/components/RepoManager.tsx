import React, { useState, useEffect } from "react";
import { fetchRepos, switchRepo, indexLocalRepo, cloneAndIndexGithub } from "../utils/api";
import type { RepoRegistry } from "../utils/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FolderPlus, RefreshCw, GitBranch, Share2, Play, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface RepoManagerProps {
  onRepoUpdated: () => void;
}

export const RepoManager: React.FC<RepoManagerProps> = ({ onRepoUpdated }) => {
  const [localPath, setLocalPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [repos, setRepos] = useState<RepoRegistry>({});
  const [activeRepo, setActiveRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const loadReposList = async () => {
    try {
      const data = await fetchRepos();
      setRepos(data);
      if (Object.keys(data).length > 0 && !activeRepo) {
        const firstKey = Object.keys(data)[0];
        setActiveRepo(data[firstKey]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReposList();
  }, []);

  const triggerAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 8000);
  };

  const handleIndexLocal = async () => {
    if (!localPath.trim()) {
      triggerAlert("error", "Please provide a valid local repository path.");
      return;
    }
    setLoading(true);
    setLoadingText("Indexing local codebase...");
    try {
      const res = await indexLocalRepo(localPath);
      triggerAlert("success", `✓ Indexed local repository successfully. Added ${res.chunks_added} chunks.`);
      setLocalPath("");
      loadReposList();
      onRepoUpdated();
    } catch (err: any) {
      triggerAlert("error", `Failed to index repository: ${err.message || err}`);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleResetLocal = async () => {
    if (!localPath.trim()) {
      triggerAlert("error", "Please provide a valid local repository path to reset.");
      return;
    }
    setLoading(true);
    setLoadingText("Reindexing local codebase...");
    try {
      const res = await switchRepo(localPath);
      triggerAlert("success", `✓ Reindexed local repository successfully. Loaded ${res.chunks_added} chunks.`);
      loadReposList();
      onRepoUpdated();
    } catch (err: any) {
      triggerAlert("error", `Failed to reset and reindex repository: ${err.message || err}`);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleIndexGithub = async () => {
    if (!githubUrl.trim()) {
      triggerAlert("error", "Please provide a valid GitHub URL.");
      return;
    }
    setLoading(true);
    setLoadingText("Cloning and indexing GitHub repository...");
    try {
      const res = await cloneAndIndexGithub(githubUrl);
      if (res.error) {
        triggerAlert("error", res.error);
      } else {
        triggerAlert("success", `✓ Indexed GitHub repository. Added ${res.chunks_added} chunks.`);
        setGithubUrl("");
        loadReposList();
        onRepoUpdated();
      }
    } catch (err: any) {
      triggerAlert("error", `Failed to clone and index GitHub: ${err.message || err}`);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleSwitchRepo = async () => {
    if (!activeRepo) {
      triggerAlert("error", "Please select a repository to switch to.");
      return;
    }
    setLoading(true);
    setLoadingText("Switching active repository...");
    try {
      const res = await switchRepo(activeRepo);
      triggerAlert("success", `✓ Switched active repository successfully. Loaded ${res.chunks_added} chunks.`);
      onRepoUpdated();
    } catch (err: any) {
      triggerAlert("error", `Failed to switch repository: ${err.message || err}`);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8 max-w-4xl w-full mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Alert logs */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-sky-800/30 bg-sky-950/20 text-sky-400 text-sm">
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>{loadingText}</span>
        </div>
      )}

      {alert && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
            alert.type === "success"
              ? "border-emerald-800/30 bg-emerald-950/20 text-emerald-400"
              : alert.type === "error"
              ? "border-rose-800/30 bg-rose-950/20 text-rose-400"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-300"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Cards container */}
      <Card className="border border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
        <CardHeader className="border-b border-zinc-800/80 pb-4">
          <CardTitle className="flex items-center gap-2 text-zinc-100 text-md font-bold">
            <FolderPlus size={16} className="text-cyan-400" />
            Local Repository
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            Provide the local workspace directory path to index codebase structures
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <Input
            type="text"
            className="font-mono text-xs bg-zinc-950/80 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/30"
            placeholder="/Users/username/my-project"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            disabled={loading}
          />
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
              onClick={handleIndexLocal}
              disabled={loading}
            >
              <FolderPlus size={14} className="mr-1.5" />
              Index Repo
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100"
              onClick={handleResetLocal}
              disabled={loading}
            >
              <RefreshCw size={14} className="mr-1.5" />
              Re-Index / Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
        <CardHeader className="border-b border-zinc-800/80 pb-4">
          <CardTitle className="flex items-center gap-2 text-zinc-100 text-md font-bold">
            <GitBranch size={16} className="text-cyan-400" />
            GitHub Repository
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            Provide any public Git repository URL to clone and automatically index
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex gap-3">
            <Input
              type="text"
              className="font-mono text-xs bg-zinc-950/80 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/30"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={loading}
            />
            <Button
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold shrink-0"
              onClick={handleIndexGithub}
              disabled={loading}
            >
              <Share2 size={14} className="mr-1.5" />
              Clone & Index
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
        <CardHeader className="border-b border-zinc-800/80 pb-4">
          <CardTitle className="flex items-center gap-2 text-zinc-100 text-md font-bold">
            <Play size={16} className="text-cyan-400" />
            Switch Active Repo
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            Switch between previously cached code bases
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {Object.keys(repos).length > 0 ? (
            <div className="space-y-4">
              <Select value={activeRepo} onValueChange={(val) => setActiveRepo(val || "")} disabled={loading}>
                <SelectTrigger className="w-full bg-zinc-950/80 border-zinc-800 text-zinc-200 focus:border-cyan-500/30">
                  <SelectValue placeholder="Select active repository..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border border-zinc-800 text-zinc-200">
                  {Object.keys(repos).map((name) => (
                    <SelectItem key={name} value={repos[name]} className="focus:bg-zinc-800 focus:text-zinc-100">
                      {name} ({repos[name]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
                onClick={handleSwitchRepo}
                disabled={loading}
              >
                Activate selected repository
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500 border border-dashed border-zinc-800 p-4 rounded-lg">
              No repositories indexed yet. Add a local or GitHub repo to begin.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
