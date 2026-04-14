import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Clash+Display:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080810;
    --bg2: #0e0e1a;
    --bg3: #13131f;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.12);
    --accent: #00e5a0;
    --accent2: #00c4f5;
    --text: #e8e8f0;
    --muted: #6b6b80;
    --danger: #ff4d6d;
    --mono: 'DM Mono', monospace;
    --display: 'Clash Display', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--mono); min-height: 100vh; overflow: hidden; }

  .app { display: flex; height: 100vh; }

  /* Sidebar */
  .sidebar {
    width: 260px; min-width: 260px; background: var(--bg2);
    border-right: 1px solid var(--border); display: flex;
    flex-direction: column; padding: 0; overflow: hidden;
  }

  .logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo h1 {
    font-family: var(--display); font-size: 20px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .logo p { font-size: 10px; color: var(--muted); margin-top: 4px; letter-spacing: 0.5px; }

  .sidebar-section { padding: 16px 12px 8px; }

  .sidebar-label {
    font-size: 9px; letter-spacing: 2px; color: var(--muted);
    text-transform: uppercase; padding: 0 8px; margin-bottom: 8px;
  }

  .mode-btn {
    width: 100%; text-align: left; background: none; border: none;
    color: var(--muted); font-family: var(--mono); font-size: 12px;
    padding: 8px 12px; border-radius: 8px; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 8px;
    margin-bottom: 2px;
  }

  .mode-btn:hover { background: var(--bg3); color: var(--text); }
  .mode-btn.active { background: rgba(0,229,160,0.1); color: var(--accent); border: 1px solid rgba(0,229,160,0.2); }

  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

  .sidebar-input-group { padding: 0 12px; margin-bottom: 12px; }

  .sidebar-input {
    width: 100%; background: var(--bg3); border: 1px solid var(--border2);
    color: var(--text); font-family: var(--mono); font-size: 11px;
    padding: 8px 10px; border-radius: 8px; outline: none;
    transition: border-color 0.15s;
  }

  .sidebar-input:focus { border-color: var(--accent); }
  .sidebar-input::placeholder { color: var(--muted); }

  .sidebar-input-label { font-size: 10px; color: var(--muted); margin-bottom: 6px; letter-spacing: 0.5px; }

  .btn {
    width: 100%; padding: 8px 12px; border-radius: 8px; border: none;
    font-family: var(--mono); font-size: 11px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; margin-bottom: 6px;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #080810;
  }

  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-ghost {
    background: var(--bg3); color: var(--muted);
    border: 1px solid var(--border);
  }

  .btn-ghost:hover { border-color: var(--border2); color: var(--text); }

  .status-msg {
    font-size: 10px; padding: 6px 10px; border-radius: 6px; margin: 4px 12px;
  }

  .status-success { background: rgba(0,229,160,0.1); color: var(--accent); border: 1px solid rgba(0,229,160,0.2); }
  .status-error { background: rgba(255,77,109,0.1); color: var(--danger); border: 1px solid rgba(255,77,109,0.2); }

  .repo-list { padding: 0 12px; flex: 1; overflow-y: auto; }

  .repo-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
    margin-bottom: 4px; cursor: pointer; transition: all 0.15s;
    background: var(--bg3);
  }

  .repo-item:hover { border-color: var(--border2); }
  .repo-item.selected { border-color: rgba(0,229,160,0.3); background: rgba(0,229,160,0.05); }

  .repo-name { font-size: 11px; color: var(--text); }
  .repo-switch { font-size: 9px; color: var(--muted); }

  .sidebar-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }

  .endpoints { padding: 12px; margin-top: auto; border-top: 1px solid var(--border); }
  .endpoints pre {
    font-size: 9px; color: var(--muted); background: var(--bg3);
    padding: 8px; border-radius: 6px; border: 1px solid var(--border);
    line-height: 1.8;
  }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .topbar {
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--bg2);
  }

  .topbar-mode {
    font-size: 11px; color: var(--muted);
    background: var(--bg3); padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--border);
  }

  .topbar-mode span { color: var(--accent); margin-left: 4px; }

  .status-dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
    box-shadow: 0 0 8px var(--accent); animation: pulse 2s infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* Messages */
  .messages {
    flex: 1; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; gap: 16px;
  }

  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    color: var(--muted);
  }

  .empty-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: var(--bg3); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }

  .empty-title { font-family: var(--display); font-size: 16px; color: var(--text); }
  .empty-sub { font-size: 11px; color: var(--muted); }

  .message { display: flex; gap: 12px; max-width: 800px; }
  .message.user { align-self: flex-end; flex-direction: row-reverse; }

  .msg-avatar {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 11px;
  }

  .msg-avatar.user { background: rgba(0,229,160,0.15); color: var(--accent); border: 1px solid rgba(0,229,160,0.2); }
  .msg-avatar.ai { background: var(--bg3); color: var(--muted); border: 1px solid var(--border); }

  .msg-bubble {
    padding: 12px 16px; border-radius: 12px; font-size: 13px;
    line-height: 1.7; max-width: 640px;
  }

  .message.user .msg-bubble {
    background: rgba(0,229,160,0.08); border: 1px solid rgba(0,229,160,0.15);
    color: var(--text);
  }

  .message.ai .msg-bubble {
    background: var(--bg2); border: 1px solid var(--border); color: var(--text);
  }

  .cursor { display: inline-block; width: 2px; height: 14px; background: var(--accent); margin-left: 2px; animation: blink 0.8s infinite; vertical-align: middle; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  /* Agent steps */
  .agent-steps { display: flex; flex-direction: column; gap: 8px; }

  .agent-step {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
  }

  .agent-step-header {
    padding: 8px 12px; display: flex; align-items: center; gap: 8px;
    cursor: pointer; font-size: 11px;
  }

  .agent-badge {
    padding: 2px 8px; border-radius: 4px; font-size: 9px; letter-spacing: 1px;
    text-transform: uppercase; font-weight: 500;
  }

  .badge-coder { background: rgba(0,196,245,0.15); color: var(--accent2); }
  .badge-executor { background: rgba(0,229,160,0.15); color: var(--accent); }
  .badge-reviewer { background: rgba(255,200,0,0.15); color: #ffc800; }
  .badge-debugger { background: rgba(255,77,109,0.15); color: var(--danger); }
  .badge-default { background: var(--bg2); color: var(--muted); }

  .status-ok { color: var(--accent); font-size: 10px; margin-left: auto; }
  .status-err { color: var(--danger); font-size: 10px; margin-left: auto; }

  .agent-step-body {
    padding: 0 12px 12px; font-size: 11px; color: var(--muted);
    line-height: 1.6; border-top: 1px solid var(--border);
    white-space: pre-wrap; max-height: 200px; overflow-y: auto;
  }

  /* Input */
  .input-area {
    padding: 16px 24px 20px; border-top: 1px solid var(--border);
    background: var(--bg2);
  }

  .input-row {
    display: flex; gap: 10px; align-items: flex-end;
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: 12px; padding: 10px 12px;
    transition: border-color 0.15s;
  }

  .input-row:focus-within { border-color: rgba(0,229,160,0.4); }

  .chat-input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text); font-family: var(--mono); font-size: 13px;
    resize: none; min-height: 24px; max-height: 120px; line-height: 1.5;
  }

  .chat-input::placeholder { color: var(--muted); }

  .send-btn {
    width: 32px; height: 32px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #080810; cursor: pointer; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
    transition: all 0.15s; font-size: 14px;
  }

  .send-btn:hover { transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .input-hint { font-size: 10px; color: var(--muted); margin-top: 8px; text-align: center; }
`;

const BADGE = { coder: "badge-coder", executor: "badge-executor", code_executor: "badge-executor", reviewer: "badge-reviewer", debugger: "badge-debugger" };

export default function App() {
  const [mode, setMode] = useState("ask");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [repoPath, setRepoPath] = useState("/Users/harshitgangwar/devpilot-ai");
  const [githubUrl, setGithubUrl] = useState("");
  const [repos, setRepos] = useState({});
  const [statusMsg, setStatusMsg] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/repos`).then(r => r.json()).then(setRepos).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showStatus = (msg, type = "success") => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const indexRepo = async (clear = false) => {
    if (!repoPath) return;
    setLoading(true);
    try {
      if (clear) {
        await fetch(`${API}/repos/switch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: repoPath }) });
      } else {
        await fetch(`${API}/upload-repo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: repoPath }) });
      }
      const r = await fetch(`${API}/repos`);
      setRepos(await r.json());
      showStatus("Repo indexed successfully");
    } catch { showStatus("Failed to index repo", "error"); }
    setLoading(false);
  };

  const cloneGithub = async () => {
    if (!githubUrl) return;
    setLoading(true);
    showStatus("Cloning... this may take 30-60s");
    try {
      const r = await fetch(`${API}/upload-github`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: githubUrl }) });
      const d = await r.json();
      if (d.error) showStatus(d.error, "error");
      else { showStatus(`Indexed ${d.chunks_added} chunks from GitHub`); setRepos(await (await fetch(`${API}/repos`)).json()); }
    } catch { showStatus("Clone failed", "error"); }
    setLoading(false);
  };

  const switchRepo = async (path) => {
    setLoading(true);
    try {
      await fetch(`${API}/repos/switch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
      showStatus(`Switched repo`);
    } catch { showStatus("Switch failed", "error"); }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    if (mode === "ask") {
      let full = "";
      const aiIdx = messages.length + 1;
      setMessages(m => [...m, { role: "ai", content: "", streaming: true }]);
      try {
        const r = await fetch(`${API}/ask/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: userMsg }) });
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = dec.decode(value).split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const token = line.slice(6);
              if (token === "[DONE]") break;
              full += token;
              setMessages(m => m.map((msg, i) => i === aiIdx ? { ...msg, content: full } : msg));
            }
          }
        }
      } catch { full = "Error connecting to backend."; }
      setMessages(m => m.map((msg, i) => i === aiIdx ? { ...msg, content: full, streaming: false } : msg));
    } else {
      setMessages(m => [...m, { role: "ai", content: "", streaming: true, agentSteps: [] }]);
      const aiIdx = messages.length + 1;
      try {
        const r = await fetch(`${API}/agent/run/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: userMsg }) });
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        const steps = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = dec.decode(value).split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const token = line.slice(6);
              if (token === "[DONE]") break;
              try {
                const step = JSON.parse(token);
                steps.push(step);
                setMessages(m => m.map((msg, i) => i === aiIdx ? { ...msg, agentSteps: [...steps], content: steps[steps.length - 1]?.output || "" } : msg));
              } catch { }
            }
          }
        }
      } catch { }
      setMessages(m => m.map((msg, i) => i === aiIdx ? { ...msg, streaming: false } : msg));
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="logo">
            <h1>DevPilot AI</h1>
            <p>// multi-agent developer assistant</p>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Mode</div>
            {[["ask", "Ask (RAG)"], ["agent", "Agent Run"]].map(([id, label]) => (
              <button key={id} className={`mode-btn ${mode === id ? "active" : ""}`} onClick={() => setMode(id)}>
                <span className="dot" />
                {label}
              </button>
            ))}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <div className="sidebar-label">Index Repo</div>
          </div>

          <div className="sidebar-input-group">
            <div className="sidebar-input-label">Local Path</div>
            <input className="sidebar-input" value={repoPath} onChange={e => setRepoPath(e.target.value)} placeholder="/path/to/project" />
          </div>
          <div style={{ padding: "0 12px", display: "flex", gap: "6px" }}>
            <button className="btn btn-primary" onClick={() => indexRepo(false)} disabled={loading} style={{ flex: 1 }}>Index</button>
            <button className="btn btn-ghost" onClick={() => indexRepo(true)} disabled={loading} style={{ flex: 1 }}>Reset</button>
          </div>

          <div className="sidebar-input-group" style={{ marginTop: "12px" }}>
            <div className="sidebar-input-label">GitHub URL</div>
            <input className="sidebar-input" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo" />
          </div>
          <div style={{ padding: "0 12px" }}>
            <button className="btn btn-primary" onClick={cloneGithub} disabled={loading}>Clone & Index</button>
          </div>

          {statusMsg && (
            <div className={`status-msg ${statusMsg.type === "error" ? "status-error" : "status-success"}`}>
              {statusMsg.msg}
            </div>
          )}

          {Object.keys(repos).length > 0 && (
            <>
              <hr className="sidebar-divider" style={{ margin: "12px 0" }} />
              <div className="sidebar-section">
                <div className="sidebar-label">Saved Repos</div>
              </div>
              <div className="repo-list">
                {Object.entries(repos).map(([name, path]) => (
                  <div key={name} className="repo-item" onClick={() => switchRepo(path)}>
                    <span className="repo-name">{name}</span>
                    <span className="repo-switch">switch →</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="endpoints">
            <pre>{`POST /ask/stream\nPOST /agent/run/stream\nPOST /upload-github\nGET  /repos\nGET  /mcp/tools`}</pre>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-mode">mode: <span>{mode === "ask" ? "ask (rag)" : "agent run"}</span></div>
            <div className="status-dot" title="Backend connected" />
          </div>

          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚡</div>
                <div className="empty-title">DevPilot AI</div>
                <div className="empty-sub">Index a repo → then ask anything about your code</div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className={`msg-avatar ${msg.role}`}>{msg.role === "user" ? "you" : "ai"}</div>
                  <div className="msg-bubble">
                    {msg.agentSteps?.length > 0 ? (
                      <div className="agent-steps">
                        {msg.agentSteps.map((step, si) => (
                          <div key={si} className="agent-step">
                            <div className="agent-step-header" onClick={() => setExpandedSteps(e => ({ ...e, [`${i}-${si}`]: !e[`${i}-${si}`] }))}>
                              <span className={`agent-badge ${BADGE[step.agent] || "badge-default"}`}>{step.agent}</span>
                              <span className={step.status === "success" ? "status-ok" : "status-err"}>
                                {step.status === "success" ? "✓ done" : "✗ error"}
                              </span>
                            </div>
                            {expandedSteps[`${i}-${si}`] && (
                              <div className="agent-step-body">{step.output}</div>
                            )}
                          </div>
                        ))}
                        {msg.streaming && <span className="cursor" />}
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {msg.streaming && <span className="cursor" />}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-row">
              <textarea
                ref={textareaRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={mode === "ask" ? "// ask anything about your codebase..." : "// describe a task for agents to execute..."}
                rows={1}
                disabled={loading}
              />
              <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? "·" : "↑"}
              </button>
            </div>
            <div className="input-hint">Enter to send · Shift+Enter for new line · {mode === "ask" ? "RAG mode" : "Agent mode"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
