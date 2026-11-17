import React, { useState } from "react";
import { X, Settings, Server, Cpu, Database, Check, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { API_BASE, resetSessionId } from "../utils/api";
import { useToast } from "./ui/Toast";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRepo: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, activeRepo }) => {
  const { toast } = useToast();
  const [apiBaseUrl, setApiBaseUrl] = useState(
    localStorage.getItem("devpilot_api_base") || API_BASE
  );
  const [modelName, setModelName] = useState(
    localStorage.getItem("devpilot_model") || "openrouter/custom"
  );
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "ok" | "fail">("idle");

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/observability/health`);
      if (res.ok) {
        setConnectionStatus("ok");
        toast({ type: "success", title: "API Gateway Online", description: `Successfully pinged ${apiBaseUrl}` });
      } else {
        setConnectionStatus("fail");
        toast({ type: "error", title: "Connection Failed", description: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      setConnectionStatus("fail");
      toast({ type: "error", title: "Connection Error", description: e.message || "Cannot reach server" });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("devpilot_api_base", apiBaseUrl);
    localStorage.setItem("devpilot_model", modelName);
    toast({ type: "success", title: "Settings Saved", description: "Preferences saved to local browser storage" });
    onClose();
  };

  const handleResetSession = () => {
    const newId = resetSessionId();
    toast({ type: "info", title: "Session Reset", description: `Initialized new session ID: ${newId}` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-900 dark:text-zinc-100 animate-scale-in"
        role="dialog"
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">Preferences & Configuration</h2>
              <p className="text-xs text-zinc-500 font-mono">DevPilot AI Platform v2.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* API Server Endpoint */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server size={14} className="text-cyan-600 dark:text-cyan-400" />
                API Gateway Endpoint
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                connectionStatus === "ok" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                connectionStatus === "fail" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-zinc-500"
              }`}>
                {connectionStatus === "ok" ? "ONLINE" : connectionStatus === "fail" ? "OFFLINE" : "UNTESTED"}
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 focus:border-cyan-500/50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="shrink-0 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-2xs"
              >
                {testingConnection ? <RefreshCw size={13} className="animate-spin" /> : "Ping"}
              </Button>
            </div>
          </div>

          {/* Model Selection Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Cpu size={14} className="text-cyan-600 dark:text-cyan-400" />
              Primary LLM Provider
            </label>
            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="openrouter/custom"
              className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 focus:border-cyan-500/50"
            />
            <p className="text-[11px] text-zinc-500 font-mono">
              Managed via backend OpenRouter / CrewAI CustomLLM provider.
            </p>
          </div>

          {/* Active Workspace Info */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database size={15} className="text-cyan-600 dark:text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Active Workspace</div>
                <div className="text-[11px] text-zinc-500 font-mono">{activeRepo || "No active repo"}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSession}
              className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-2xs"
            >
              Reset Session
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-2xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Check size={14} className="mr-1" />
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
