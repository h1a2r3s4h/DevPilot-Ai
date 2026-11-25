export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface RepoRegistry {
  [name: string]: string;
}

export interface RepoDetail {
  name: string;
  path: string;
  exists: boolean;
  file_count: number;
  size_kb: number;
  chunks_count: number;
  is_active: boolean;
}

export interface IndexResponse {
  message: string;
  chunks_added: number;
  error?: string;
}

export interface AgentStep {
  agent: string;
  status: "success" | "running" | "failed" | "error" | "needs_review";
  output: string;
  tools_used?: string[];
  next_agent?: string | null;
}

export interface ActiveRepoResponse {
  name: string;
  path: string;
}

// Fetch all indexed repositories dictionary
export async function fetchRepos(): Promise<RepoRegistry> {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error("Failed to fetch repositories");
  return res.json();
}

// Fetch detailed metadata for all registered repositories
export async function fetchReposDetails(): Promise<{ repositories: RepoDetail[]; total: number }> {
  const res = await fetch(`${API_BASE}/repos/details`);
  if (!res.ok) throw new Error("Failed to fetch repository details");
  return res.json();
}

// Delete a repository from registry
export async function deleteRepo(name: string): Promise<{ message: string; remaining: number }> {
  const res = await fetch(`${API_BASE}/repos/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || `Failed to delete repository (HTTP ${res.status})`);
  return data;
}

// Fetch currently active repository details
export async function fetchActiveRepo(): Promise<ActiveRepoResponse> {
  const res = await fetch(`${API_BASE}/repos/active`);
  if (!res.ok) throw new Error("Failed to fetch active repository");
  return res.json();
}

// Switch current active repository
export async function switchRepo(path: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/repos/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || data.detail || `Failed to switch repository (HTTP ${res.status})`);
  return data;
}

// Index a local repository path
export async function indexLocalRepo(path: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/upload-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || data.detail || `Failed to index repository (HTTP ${res.status})`);
  return data;
}

// Clone and index a GitHub repository
export async function cloneAndIndexGithub(url: string): Promise<IndexResponse> {
  const res = await fetch(`${API_BASE}/upload-github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error || data.detail || `Failed to clone and index GitHub repository (HTTP ${res.status})`);
  return data;
}

// Preview Multi-Agent Execution Plan
export async function fetchAgentPlan(query: string): Promise<{ query: string; steps: any[]; error?: string }> {
  const res = await fetch(`${API_BASE}/agent/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Failed to generate execution plan");
  return res.json();
}

// Session Management for isolated conversation contexts
export function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem("devpilot_session_id");
    if (!id) {
      id = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
      localStorage.setItem("devpilot_session_id", id);
    }
    return id;
  } catch {
    return "sess_default_" + Date.now();
  }
}

export function resetSessionId(): string {
  try {
    const newId = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    localStorage.setItem("devpilot_session_id", newId);
    return newId;
  } catch {
    return "sess_default_" + Date.now();
  }
}

// Stream Ask/RAG response with AbortSignal support
export async function streamAsk(
  prompt: string,
  onToken: (token: string) => void,
  onError: (err: any) => void,
  sessionId?: string,
  signal?: AbortSignal,
  model?: string
): Promise<void> {
  try {
    const session_id = sessionId || getOrCreateSessionId();
    const response = await fetch(`${API_BASE}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt,
        user_id: "default_user",
        session_id,
        model: model || undefined
      }),
      signal
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
          } catch {
            onToken(rawPayload);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      return; // Gracefully stopped by user
    }
    onError(error);
  }
}

// Stream Agent Run execution with AbortSignal support
export async function streamAgentRun(
  query: string,
  onStep: (step: AgentStep) => void,
  onDone: () => void,
  onError: (err: any) => void,
  sessionId?: string,
  signal?: AbortSignal
): Promise<void> {
  try {
    const session_id = sessionId || getOrCreateSessionId();
    const response = await fetch(`${API_BASE}/agent/run/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query,
        user_id: "default_user",
        session_id
      }),
      signal
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
  } catch (error: any) {
    if (error.name === "AbortError") {
      onDone();
      return;
    }
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
      p99?: number;
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
  if (level && level !== "ALL") params.append("level", level);
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

export interface FileContentResponse {
  file_path: string;
  filename: string;
  content: string;
  lines: number;
  language: string;
  size_bytes: number;
}

export async function fetchFileContent(filePath: string): Promise<FileContentResponse> {
  const params = new URLSearchParams({ file_path: filePath });
  const res = await fetch(`${API_BASE}/api/diff/file-content?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to read file ${filePath}`);
  }
  return res.json();
}

// -------------------------------------------------------------
// Git & Automated PR Workflow
// -------------------------------------------------------------

export interface GitStatusResponse {
  is_repo: boolean;
  repo_path: string;
  current_branch: string;
  branches: string[];
  modified_files: string[];
  untracked_files: string[];
  staged_files: string[];
  is_clean: boolean;
  remote_url: string | null;
  github_repo: string | null;
}

export interface GitBranchResponse {
  success: boolean;
  branch: string;
  message: string;
}

export interface GitCommitResponse {
  success: boolean;
  commit_hash?: string;
  message: string;
}

export interface GitPrDraftResponse {
  branch_name: string;
  commit_message: string;
  pr_title: string;
  pr_body: string;
}

export interface GitCreatePrResponse {
  success: boolean;
  github_repo: string;
  web_compare_url: string;
  api_result?: {
    success: boolean;
    pr_url?: string;
    pr_number?: number;
    state?: string;
    error?: string;
  };
}

export async function fetchGitStatus(repoPath?: string): Promise<GitStatusResponse> {
  const params = repoPath ? `?repo_path=${encodeURIComponent(repoPath)}` : "";
  const res = await fetch(`${API_BASE}/api/git/status${params}`);
  if (!res.ok) throw new Error("Failed to fetch repository Git status");
  return res.json();
}

export async function createGitBranch(
  branchName: string,
  baseBranch?: string,
  repoPath?: string
): Promise<GitBranchResponse> {
  const res = await fetch(`${API_BASE}/api/git/branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch_name: branchName,
      base_branch: baseBranch,
      repo_path: repoPath,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to create and checkout branch");
  return data;
}

export async function checkoutGitBranch(
  branchName: string,
  repoPath?: string
): Promise<{ success: boolean; branch: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/git/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch_name: branchName,
      repo_path: repoPath,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to switch branch");
  return data;
}

export async function commitGitChanges(
  message: string,
  files?: string[],
  repoPath?: string
): Promise<GitCommitResponse> {
  const res = await fetch(`${API_BASE}/api/git/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      files,
      repo_path: repoPath,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to commit changes");
  return data;
}

export async function generateGitPrDraft(
  diffText?: string,
  taskDescription?: string,
  titleHint?: string,
  model?: string
): Promise<GitPrDraftResponse> {
  const res = await fetch(`${API_BASE}/api/git/draft-pr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diff_text: diffText || "",
      task_description: taskDescription || "",
      title_hint: titleHint || "",
      model,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to generate AI PR draft");
  return data;
}

export async function createGitPr(payload: {
  github_repo?: string;
  base_branch?: string;
  head_branch: string;
  title: string;
  body: string;
  token?: string;
  create_via_api?: boolean;
}): Promise<GitCreatePrResponse> {
  const res = await fetch(`${API_BASE}/api/git/create-pr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to generate GitHub PR");
  return data;
}
