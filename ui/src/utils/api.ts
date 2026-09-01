export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface RepoRegistry {
  [name: string]: string;
}

export interface IndexResponse {
  message: string;
  chunks_added: number;
  error?: string;
}

export interface AgentStep {
  agent: string;
  status: "success" | "running" | "failed";
  output: string;
}

// Fetch all indexed repositories
export async function fetchRepos(): Promise<RepoRegistry> {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error("Failed to fetch repositories");
  return res.json();
}

// Switch current active repository
export async function switchRepo(path: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/repos/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error("Failed to switch repository");
  return res.json();
}

// Index a local repository path
export async function indexLocalRepo(path: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/upload-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error("Failed to index repository");
  return res.json();
}

// Clone and index a GitHub repository
export async function cloneAndIndexGithub(url: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/upload-github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to clone and index GitHub repository");
  return res.json();
}

// Stream Ask/RAG response
export async function streamAsk(
  prompt: string,
  onToken: (token: string) => void,
  onError: (err: any) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported on response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          const rawPayload = trimmed.slice(6);
          if (rawPayload.trim() === "[DONE]") {
            return;
          }
          try {
            const token = JSON.parse(rawPayload);
            onToken(token);
          } catch (e) {
            onToken(rawPayload);
          }
        }
      }
    }
  } catch (error) {
    onError(error);
  }
}

// Stream Agent Run execution
export async function streamAgentRun(
  query: string,
  onStep: (step: AgentStep) => void,
  onDone: () => void,
  onError: (err: any) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/agent/run/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported on response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const step: AgentStep = JSON.parse(data);
            onStep(step);
          } catch (e) {
            console.error("Error parsing agent stream token", e, data);
          }
        }
      }
    }
  } catch (error) {
    onError(error);
  }
}

export interface DiffPreviewResponse {
  file_path: string;
  filename: string;
  exists: boolean;
  diff: string;
  has_changes: boolean;
}

export interface ApplyDiffResponse {
  success: boolean;
  message: string;
  file_path: string;
}

export async function previewDiff(filePath: string, proposedContent: string): Promise<DiffPreviewResponse> {
  const res = await fetch(`${API_BASE}/api/diff/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, proposed_content: proposedContent }),
  });
  if (!res.ok) throw new Error("Failed to generate diff preview");
  return res.json();
}

export async function applyDiff(filePath: string, proposedContent: string): Promise<ApplyDiffResponse> {
  const res = await fetch(`${API_BASE}/api/diff/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, proposed_content: proposedContent }),
  });
  if (!res.ok) throw new Error("Failed to apply code changes to file");
  return res.json();
}

// Observability interfaces
export interface ObservabilityOverview {
  metrics: {
    uptime_seconds: number;
    total_requests: number;
    total_errors: number;
    error_rate_pct: number;
    latency_ms: {
      avg: number;
      p50: number;
      p95: number;
    };
    status_codes: Record<string, number>;
    top_routes: Record<string, number>;
    llm: {
      total_calls: number;
      estimated_tokens: number;
      errors: number;
    };
    rag: {
      queries: number;
      docs_retrieved: number;
      avg_retrieval_ms: number;
    };
    cache: {
      hits: number;
      misses: number;
      hit_rate_pct: number;
    };
    agent: {
      runs: number;
      steps: number;
      errors: number;
    };
  };
  health: SystemHealth;
}

export interface SystemHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  timestamp: string;
  system: {
    cpu_percent: number;
    memory: {
      total_mb: number;
      used_mb: number;
      percent: number;
    };
    disk: {
      total_gb: number;
      free_gb: number;
      percent: number;
    };
  };
  components: Record<string, { status: string; [key: string]: any }>;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "TRACE";
  logger: string;
  component: string;
  message: string;
  details?: any;
}

export interface TraceSpan {
  id: string;
  name: string;
  type: "RAG" | "AGENT" | "LLM" | "CACHE" | "DOCKER";
  timestamp: string;
  duration_ms: number;
  status: "SUCCESS" | "ERROR";
  metadata?: any;
}

export async function fetchObservabilityOverview(): Promise<ObservabilityOverview> {
  const res = await fetch(`${API_BASE}/api/observability/overview`);
  if (!res.ok) throw new Error("Failed to fetch observability metrics");
  return res.json();
}

export async function fetchObservabilityLogs(level?: string, search?: string, limit = 100): Promise<SystemLog[]> {
  const params = new URLSearchParams();
  if (level) params.append("level", level);
  if (search) params.append("search", search);
  params.append("limit", limit.toString());

  const res = await fetch(`${API_BASE}/api/observability/logs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch system logs");
  const data = await res.json();
  return data.logs || [];
}

export async function fetchObservabilityTraces(limit = 50): Promise<TraceSpan[]> {
  const res = await fetch(`${API_BASE}/api/observability/traces?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch trace spans");
  const data = await res.json();
  return data.spans || [];
}

export async function clearObservabilityLogs(): Promise<void> {
  await fetch(`${API_BASE}/api/observability/logs/clear`, { method: "POST" });
}

