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
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Database,
  Bot
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


export const ObservabilityDashboard: React.FC = () => {
  const [data, setData] = useState<ObservabilityOverview | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [logLevel, setLogLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"logs" | "traces" | "components">("logs");

  const loadData = async () => {
    try {
      const [overviewData, logData, traceData] = await Promise.all([
        fetchObservabilityOverview(),
        fetchObservabilityLogs(logLevel, searchQuery),
        fetchObservabilityTraces()
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
    await clearObservabilityLogs();
    await loadData();
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

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-8 gap-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="text-cyan-400" size={24} />
            <h1 className="text-xl font-heading font-extrabold text-zinc-100 tracking-tight">
              Observability & System Telemetry
            </h1>
            <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              LIVE MONITORING
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Real-time metrics, request latency distributions, trace spans, and system logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              autoRefresh
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? "animate-spin" : ""} />
            <span>{autoRefresh ? "Auto-Refresh On (3s)" : "Auto-Refresh Off"}</span>
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests & Latency */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Total API Requests</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-100 font-mono">
              {metrics?.total_requests ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>p50: <strong className="text-cyan-400">{metrics?.latency_ms?.p50 ?? 0}ms</strong></span>
              <span>•</span>
              <span>p95: <strong className="text-amber-400">{metrics?.latency_ms?.p95 ?? 0}ms</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: LLM Telemetry */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">LLM Token Usage</span>
            <Bot size={16} className="text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-100 font-mono">
              ~{metrics?.llm?.estimated_tokens?.toLocaleString() ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>Calls: <strong className="text-zinc-200">{metrics?.llm?.total_calls ?? 0}</strong></span>
              <span>•</span>
              <span>Errors: <strong className={metrics?.llm?.errors ? "text-rose-400" : "text-emerald-400"}>{metrics?.llm?.errors ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 3: Cache & RAG Stats */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Cache Hit Ratio</span>
            <Database size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-zinc-100 font-mono">
              {metrics?.cache?.hit_rate_pct ?? 0}%
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
              <span>Hits: <strong className="text-emerald-400">{metrics?.cache?.hits ?? 0}</strong></span>
              <span>•</span>
              <span>Misses: <strong className="text-zinc-400">{metrics?.cache?.misses ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 4: System Health & Uptime */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">System Status</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${health?.status === 'HEALTHY' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xl font-extrabold text-zinc-100 font-mono">
                {health?.status ?? "HEALTHY"}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-1.5">
              <Clock size={11} />
              <span>Uptime: {formatUptime(metrics?.uptime_seconds ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Resources & Component Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Bar */}
        <div className="bg-zinc-900/40 border border-zinc-800/70 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span className="flex items-center gap-1.5"><Cpu size={14} className="text-cyan-400" /> CPU Utilization</span>
            <span className="font-bold text-cyan-400">{health?.system?.cpu_percent ?? 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500" 
              style={{ width: `${Math.min(health?.system?.cpu_percent ?? 0, 100)}%` }} 
            />
          </div>
        </div>

        {/* Memory Bar */}
        <div className="bg-zinc-900/40 border border-zinc-800/70 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span className="flex items-center gap-1.5"><Server size={14} className="text-emerald-400" /> RAM Memory ({health?.system?.memory?.used_mb ?? 0} MB)</span>
            <span className="font-bold text-emerald-400">{health?.system?.memory?.percent ?? 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full transition-all duration-500" 
              style={{ width: `${Math.min(health?.system?.memory?.percent ?? 0, 100)}%` }} 
            />
          </div>
        </div>

        {/* Disk Space */}
        <div className="bg-zinc-900/40 border border-zinc-800/70 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span className="flex items-center gap-1.5"><HardDrive size={14} className="text-amber-400" /> Disk Capacity</span>
            <span className="font-bold text-amber-400">{health?.system?.disk?.percent ?? 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-amber-500 to-rose-400 h-full transition-all duration-500" 
              style={{ width: `${Math.min(health?.system?.disk?.percent ?? 0, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Main Tabbed Area: Logs / Traces / Component Health */}
      <div className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden min-h-[450px]">
        {/* Tab Selection Navigation */}
        <div className="flex items-center justify-between px-4 pt-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all ${
                activeTab === "logs"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal size={14} />
              <span>System Log Stream ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("traces")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all ${
                activeTab === "traces"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers size={14} />
              <span>Trace Spans ({traces.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("components")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all ${
                activeTab === "components"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Server size={14} />
              <span>Component Diagnostic Grid</span>
            </button>
          </div>

          {activeTab === "logs" && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-rose-400 transition-all mb-1"
              title="Clear log buffer"
            >
              <Trash2 size={13} />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        {/* Tab 1: System Log Stream */}
        {activeTab === "logs" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter controls */}
            <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword or component..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <div className="flex items-center gap-1">
                {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogLevel(lvl)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                      logLevel === lvl
                        ? lvl === "ERROR"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : lvl === "WARN"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Log Table / List */}
            <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-1">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 italic">
                  No log entries matching criteria...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 transition-all font-mono"
                  >
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {log.timestamp}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        log.level === "ERROR"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : log.level === "WARN"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}
                    >
                      {log.level}
                    </span>

                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                      {log.component}
                    </span>

                    <span className="text-zinc-200 flex-1 truncate">
                      {log.message}
                    </span>

                    {log.details && (
                      <span className="text-[10px] text-zinc-500 truncate max-w-xs bg-zinc-900/80 px-2 py-0.5 rounded">
                        {JSON.stringify(log.details)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Trace Spans Timeline */}
        {activeTab === "traces" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {traces.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic">
                No trace spans recorded yet. Trigger an RAG search or Agent run to view trace spans.
              </div>
            ) : (
              traces.map((span) => (
                <div
                  key={span.id}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        span.type === "RAG"
                          ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          : span.type === "AGENT"
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                          : span.type === "LLM"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      {span.type}
                    </span>

                    <div>
                      <div className="font-bold text-zinc-100">{span.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Span ID: {span.id} • Started: {span.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {span.metadata && (
                      <div className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 hidden md:block">
                        {Object.entries(span.metadata).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-500/20">
                        {span.duration_ms} ms
                      </span>

                      {span.status === "SUCCESS" ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className="text-rose-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Component Diagnostic Grid */}
        {activeTab === "components" && (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {health?.components &&
              Object.entries(health.components).map(([compName, compInfo]) => {
                const isOnline = compInfo.status === "ONLINE" || compInfo.status === "LOADED" || compInfo.status === "ACTIVE";
                return (
                  <div
                    key={compName}
                    className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex items-start justify-between"
                  >
                    <div>
                      <div className="font-heading font-extrabold text-zinc-100 uppercase tracking-wide text-xs">
                        {compName.replace(/_/g, " ")}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-1">
                        Status:{" "}
                        <span className={isOnline ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                          {compInfo.status}
                        </span>
                      </div>
                      {compInfo.buffered_entries !== undefined && (
                        <div className="text-[10px] font-mono text-zinc-500 mt-1">
                          Buffer Count: {compInfo.buffered_entries} items
                        </div>
                      )}
                    </div>

                    {isOnline ? (
                      <CheckCircle2 className="text-emerald-400" size={20} />
                    ) : (
                      <AlertTriangle className="text-amber-400" size={20} />
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
