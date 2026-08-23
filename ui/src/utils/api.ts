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
