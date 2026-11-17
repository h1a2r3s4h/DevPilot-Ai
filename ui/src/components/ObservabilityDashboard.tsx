import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  Search, 
  Terminal, 
  Layers, 
  Server, 
  Database,
  Bot,
  Download
} from "lucide-react";
import { 
  fetchObservabilityOverview, 
  fetchObservabilityLogs, 
  fetchObservabilityTraces, 
  clearObservabilityLogs,
  type ObservabilityOverview, 
  type SystemLog, 
  type TraceSpan 
} from "../utils/api";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./ui/Toast";

export const ObservabilityDashboard: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<ObservabilityOverview | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [logLevel, setLogLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"metrics" | "logs" | "traces" | "components">("metrics");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadData = async () => {
    try {
      const [overviewData, logData, traceData] = await Promise.all([
        fetchObservabilityOverview(),
        fetchObservabilityLogs(logLevel, searchQuery),
        fetchObservabilityTraces(),
      ]);
      setData(overviewData);
      setLogs(logData);
      setTraces(traceData);
    } catch (e) {
      console.error("Error fetching observability data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [logLevel, searchQuery]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, logLevel, searchQuery]);

  const handleClearLogs = async () => {
    try {
      await clearObservabilityLogs();
      toast({ type: "info", title: "Logs Cleared", description: "In-memory telemetry buffer reset" });
      setShowClearConfirm(false);
      await loadData();
    } catch (err: any) {
      toast({ type: "error", title: "Failed to clear logs", description: err.message });
    }
  };

  const handleExportLogs = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `devpilot_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast({ type: "success", title: "Logs Exported", description: `Exported ${logs.length} structured log records` });
    } catch (err: any) {
      toast({ type: "error", title: "Export Error", description: err.message });
    }
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-cyan-400 font-mono">
        <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-6 py-4 rounded-xl">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading Telemetry Metrics & Logs...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const health = data?.health;
  const latencies = metrics?.latency_ms || { avg: 0, p50: 0, p95: 0, p99: 0 };
  const maxLat = Math.max(latencies.p99 || 0, latencies.p95, latencies.p50, latencies.avg, 10);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950 overflow-y-auto p-8 gap-6 animate-fade-in transition-colors duration-300">
      {/* Top Header & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="text-cyan-600 dark:text-cyan-400" size={24} />
            <h1 className="text-xl font-heading font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Observability & Real-Time Telemetry
            </h1>
            <span className="text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              LIVE SYSTEM
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            Request latency distributions (P50/P95/P99), trace spans, resource telemetry, and system logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              autoRefresh
                ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400 font-semibold shadow-2xs"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""} />
            <span>{autoRefresh ? "Live Poll (3s)" : "Polling Paused"}</span>
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 transition-all shadow-2xs"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* KPI Cards Row (P50, P95, P99) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: API Requests & Latency */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total API Requests</span>
            <Zap size={16} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              {metrics?.total_requests ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex flex-wrap items-center gap-2">
              <span>p50: <strong className="text-cyan-600 dark:text-cyan-400">{latencies.p50}ms</strong></span>
              <span>•</span>
              <span>p95: <strong className="text-amber-600 dark:text-amber-400">{latencies.p95}ms</strong></span>
              <span>•</span>
              <span>p99: <strong className="text-rose-600 dark:text-rose-400">{latencies.p99 || latencies.p95}ms</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: LLM Tokens */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">LLM Token Usage</span>
            <Bot size={16} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              ~{metrics?.llm?.estimated_tokens?.toLocaleString() ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>Calls: <strong className="text-zinc-800 dark:text-zinc-200">{metrics?.llm?.total_calls ?? 0}</strong></span>
              <span>•</span>
              <span>Errors: <strong className={metrics?.llm?.errors ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{metrics?.llm?.errors ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 3: Cache Hit Ratio */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Cache Hit Ratio</span>
            <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
              {metrics?.cache?.hit_rate_pct ?? 0}%
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>Hits: <strong className="text-emerald-600 dark:text-emerald-400">{metrics?.cache?.hits ?? 0}</strong></span>
              <span>•</span>
              <span>Misses: <strong className="text-zinc-500 dark:text-zinc-400">{metrics?.cache?.misses ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 4: System Health */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">System Status</span>
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {health?.status || "HEALTHY"}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>Uptime: <strong className="text-zinc-800 dark:text-zinc-200">{formatUptime(metrics?.uptime_seconds ?? 0)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "metrics"
              ? "bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          <Activity size={14} />
          <span>Interactive Charts & Gauges</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "logs"
              ? "bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          <Terminal size={14} />
          <span>System Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("traces")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
            activeTab === "traces"
              ? "bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          <Layers size={14} />
          <span>Trace Spans ({traces.length})</span>
        </button>
      </div>

      {/* Tab 1: Interactive Charts & Hardware Telemetry */}
      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-scale-in">
          {/* Latency Distribution Visual Bars */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
                <Clock size={15} className="text-cyan-600 dark:text-cyan-400" />
                Response Latency Distribution (ms)
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Live Samples</span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  <span>P50 Median</span>
                  <strong className="text-cyan-600 dark:text-cyan-400">{latencies.p50} ms</strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, (latencies.p50 / maxLat) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>P95 Percentile</span>
                  <strong className="text-amber-400">{latencies.p95} ms</strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, (latencies.p95 / maxLat) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>P99 Worst Case</span>
                  <strong className="text-rose-400">{latencies.p99 || latencies.p95} ms</strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, ((latencies.p99 || latencies.p95) / maxLat) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Average Latency</span>
                  <strong className="text-zinc-200">{latencies.avg} ms</strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, (latencies.avg / maxLat) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Resources Telemetry */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
                <Cpu size={15} className="text-cyan-400" />
                Host System Resource Telemetry
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Real OS Diagnostics</span>
            </div>

            <div className="space-y-4 pt-2">
              {/* CPU Usage */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5"><Cpu size={13} /> CPU Utilization</span>
                  <strong className="text-zinc-100">{health?.system?.cpu_percent ?? 0}%</strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, health?.system?.cpu_percent ?? 5)}%` }}
                  />
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5"><Server size={13} /> Memory Usage</span>
                  <strong className="text-zinc-100">
                    {health?.system?.memory?.used_mb ?? 0} MB / {health?.system?.memory?.total_mb ?? 0} MB ({health?.system?.memory?.percent ?? 0}%)
                  </strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, health?.system?.memory?.percent ?? 5)}%` }}
                  />
                </div>
              </div>

              {/* Disk Usage */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1.5"><HardDrive size={13} /> Disk Space</span>
                  <strong className="text-zinc-100">
                    {health?.system?.disk?.free_gb ?? 0} GB Free of {health?.system?.disk?.total_gb ?? 0} GB ({health?.system?.disk?.percent ?? 0}% Used)
                  </strong>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, health?.system?.disk?.percent ?? 5)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: System Logs Explorer */}
      {activeTab === "logs" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Logs Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search size={14} className="text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs by keyword, agent or message..."
                className="w-full bg-transparent border-0 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Level:</span>
              {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogLevel(lvl)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    logLevel === lvl
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}

              <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

              <button
                onClick={handleExportLogs}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                title="Export logs as JSON file"
              >
                <Download size={12} />
                <span>Export</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400"
                title="Clear in-memory logs"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 overflow-hidden shadow-xl">
            <div className="max-h-[500px] overflow-y-auto font-mono text-xs divide-y divide-zinc-900">
              {logs.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  No log entries matched your filter.
                </div>
              ) : (
                logs.map((log) => {
                  const levelBadge =
                    log.level === "ERROR"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : log.level === "WARN"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : log.level === "SUCCESS"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";

                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className="p-3.5 hover:bg-zinc-900/50 cursor-pointer transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${levelBadge}`}>
                            {log.level}
                          </span>
                          <span className="text-zinc-500">{log.component}</span>
                          <span className="text-zinc-200 font-sans">{log.message}</span>
                        </div>
                        <span className="text-zinc-600 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Expandable JSON details */}
                      {selectedLog?.id === log.id && log.details && (
                        <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Trace Spans Explorer */}
      {activeTab === "traces" && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers size={15} className="text-cyan-400" />
              Trace Spans Timeline & Latency
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Last 50 Spans</span>
          </div>

          <div className="space-y-2">
            {traces.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                No trace spans recorded yet. Ask a question or run an agent to generate execution traces.
              </div>
            ) : (
              traces.map((trace) => {
                const isError = trace.status === "ERROR";
                return (
                  <div
                    key={trace.id}
                    className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        trace.type === "RAG" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" :
                        trace.type === "AGENT" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {trace.type}
                      </span>
                      <span className="text-zinc-200">{trace.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 font-semibold">{trace.duration_ms.toFixed(1)} ms</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        isError ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {trace.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Clear Logs Confirm Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Telemetry Logs"
        description="Are you sure you want to clear the in-memory telemetry log buffer? This will flush recent log entries."
        confirmText="Clear Logs"
        isDestructive={true}
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
