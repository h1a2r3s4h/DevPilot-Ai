import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  User, 
  Copy, 
  Check, 
  RefreshCw, 
  Square, 
  FileCode, 
  Wrench,
  ShieldAlert, 
  Layers, 
  Workflow, 
  History, 
  Plus, 
  Trash2,
  GitBranch,
  ChevronDown,
  Download,
  Eye,
  Mic,
  MicOff
} from "lucide-react";
import { DevPilotMark } from "./DevPilotMark";
import { streamAsk, getOrCreateSessionId, resetSessionId, type RepoRegistry } from "../utils/api";
import { DiffPreviewModal } from "./DiffPreviewModal";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./ui/Toast";
import { MermaidBlock, hasActualDiagramContent } from "./MermaidBlock";
import { FilePeekDrawer } from "./FilePeekDrawer";
import { SlashCommandMenu } from "./SlashCommandMenu";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
}

interface AskWorkspaceProps {
  activeRepoName: string;
  repos: RepoRegistry;
  onSwitchRepo: (path: string) => void;
}

// Code block with copy & diff preview
const CodeBlock: React.FC<{ children: string; className?: string; onDiffPreview: (code: string) => void }> = ({
  children,
  className,
  onDiffPreview,
}) => {
  const [copied, setCopied] = useState(false);
  const lang = className ? className.replace("language-", "") : "code";

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-mono">
        <span className="uppercase font-semibold tracking-wider text-cyan-400">{lang}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDiffPreview(children)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Preview git diff and staged changes"
          >
            <FileCode size={12} className="text-cyan-400" />
            <span>Preview Diff</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export const AVAILABLE_MODELS = [
  { id: "openrouter/free", name: "Auto Router (Free)", badge: "Adaptive", provider: "OpenRouter" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", badge: "Reasoning", provider: "DeepSeek" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", badge: "General", provider: "Meta" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", badge: "Fast", provider: "Google" },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder", badge: "Code", provider: "Alibaba" },
];

export const AskWorkspace: React.FC<AskWorkspaceProps> = ({
  activeRepoName,
  repos,
  onSwitchRepo,
}) => {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string>(getOrCreateSessionId());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem("devpilot_selected_model") || "openrouter/free"
  );

  const [diffCode, setDiffCode] = useState("");
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Interactive File Peek & Slash Menu state
  const [peekFilePath, setPeekFilePath] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");

  // Voice Input Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        type: "error",
        title: "Voice Input Unavailable",
        description: "Your browser does not support the Web Speech API. Please try Chrome, Edge, or Safari.",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          type: "info",
          title: "Microphone Active",
          description: "Listening... Speak your prompt now.",
        });
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          toast({
            type: "error",
            title: "Microphone Notice",
            description: `Voice input ended (${event.error}).`,
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition startup error:", err);
      setIsListening(false);
      toast({
        type: "error",
        title: "Microphone Permission",
        description: err.message || "Could not activate microphone.",
      });
    }
  };

  const handleExportReport = () => {
    if (messages.length === 0) return;
    const lines = [
      `# DevPilot AI — Architectural & Technical Report`,
      `Generated on: ${new Date().toLocaleString()}`,
      `Repository: ${activeRepoName || "devpilot-ai"}\n`,
      `---\n`
    ];
    messages.forEach((m) => {
      lines.push(`### ${m.role === "user" ? "👤 User Prompt" : "🤖 DevPilot AI Response"} (${m.timestamp})`);
      if (m.citations && m.citations.length > 0) {
        lines.push(`**Grounding Files:** ${m.citations.join(", ")}\n`);
      }
      lines.push(m.content);
      lines.push("\n---\n");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devpilot-report-${activeRepoName || "analysis"}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ type: "success", title: "Report Exported", description: "Downloaded complete session as markdown" });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Load conversation history for current session from localStorage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem("devpilot_ask_sessions");
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
      const storedMsgs = localStorage.getItem(`devpilot_msgs_${sessionId}`);
      if (storedMsgs) {
        setMessages(JSON.parse(storedMsgs));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [sessionId]);

  // Persist messages whenever streaming finishes or session changes
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      try {
        localStorage.setItem(`devpilot_msgs_${sessionId}`, JSON.stringify(messages));
        // Update session list
        setSessions((prev) => {
          const firstUserMsg = messages.find((m) => m.role === "user");
          const title = firstUserMsg ? firstUserMsg.content.slice(0, 36) + "..." : "New Chat";
          const filtered = prev.filter((s) => s.id !== sessionId);
          const updated = [{ id: sessionId, title, updatedAt: Date.now() }, ...filtered];
          localStorage.setItem("devpilot_ask_sessions", JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        console.warn("Storage save failed:", e);
      }
    }
  }, [loading, sessionId]);

  // Track user manual scrolling: if user scrolls up to read, keep screen completely static!
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Considered at bottom if within 80px
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  // Rock-solid non-jitter scroll:
  // During active streaming, do NOT use smooth-scroll (which fights browser animation loops and shakes the screen).
  // Instead, use instant scrollTop pinned directly to bottom ONLY if user is already at bottom.
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    if (loading) {
      if (shouldAutoScrollRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    } else {
      if (shouldAutoScrollRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, loading]);

  // Textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleNewChat = () => {
    if (loading && abortController) {
      abortController.abort();
    }
    const newId = resetSessionId();
    setSessionId(newId);
    setMessages([]);
    setInput("");
    setLoading(false);
    toast({ type: "info", title: "New Conversation", description: "Created fresh chat context" });
  };

  const handleClearSession = () => {
    setMessages([]);
    localStorage.removeItem(`devpilot_msgs_${sessionId}`);
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      localStorage.setItem("devpilot_ask_sessions", JSON.stringify(next));
      return next;
    });
    setShowClearConfirm(false);
    toast({ type: "info", title: "Chat Cleared", description: "Conversation history deleted" });
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      toast({ type: "info", title: "Generation Stopped", description: "Incomplete generation halted" });
    }
  };

  const extractCitations = (text: string): string[] => {
    const regex = /(?:File:\s*|#\s*File:\s*)([\w./-]+\.\w+)/gi;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1] && !matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches.slice(0, 5);
  };

  const handleSubmit = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || input;
    if (!promptToSend.trim() || loading) return;

    setInput("");
    setLoading(true);
    shouldAutoScrollRef.current = true;

    const userMsgId = "msg_" + Date.now();
    const assistantMsgId = "msg_" + (Date.now() + 1);

    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 20);

    const controller = new AbortController();
    setAbortController(controller);

    let accumulatedContent = "";

    await streamAsk(
      promptToSend,
      (token) => {
        accumulatedContent += token;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: accumulatedContent,
                  citations: extractCitations(accumulatedContent),
                }
              : m
          )
        );
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    accumulatedContent +
                    `\n\n🛡️ **System Notice**: Request could not be completed (${err.message || err}). Please try again.`,
                }
              : m
          )
        );
        toast({ type: "error", title: "Response Failed", description: String(err.message || err) });
        setLoading(false);
      },
      sessionId,
      controller.signal,
      selectedModel
    );

    setLoading(false);
    setAbortController(null);

    // If stream completed with zero tokens, show clear retry notice
    if (!accumulatedContent.trim()) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  "⚠️ **No Tokens Received**: The upstream model did not emit response tokens. Please click **Regenerate** to re-dispatch your request.",
              }
            : m
        )
      );
    }
  };

  const handleRegenerate = (lastPrompt: string) => {
    if (loading) return;
    // Remove last assistant message
    setMessages((prev) => prev.slice(0, -1));
    handleSubmit(lastPrompt);
  };

  const promptSuggestions = [
    {
      title: "Architecture Breakdown",
      desc: "Map out the core components and flow of this repository with a flowchart.",
      prompt: "Explain the architecture of this codebase, how components interact, and illustrate the request flow with a styled Mermaid diagram.",
      icon: <Workflow size={15} className="text-cyan-400" />,
    },
    {
      title: "Security & Guardrails Audit",
      desc: "Audit the guardrails and input sanitization mechanisms.",
      prompt: "Analyze the enterprise security guardrails, prompt injection defenses, and secret redaction rules implemented in this repository.",
      icon: <ShieldAlert size={15} className="text-emerald-400" />,
    },
    {
      title: "API Routes & Endpoints",
      desc: "Inspect all registered endpoints, schemas and middleware.",
      prompt: "List and explain the main FastAPI endpoints, request schemas, rate limiting, and telemetry middleware configured in this project.",
      icon: <Layers size={15} className="text-amber-400" />,
    },
    {
      title: "Refactoring & Clean Code",
      desc: "Find opportunities to optimize latency and modularity.",
      prompt: "Review the code quality, error handling, and potential performance bottlenecks across the repository, providing concrete recommendations.",
      icon: <Wrench size={15} className="text-sky-400" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative transition-colors duration-300">
      {/* Top Workspace Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-900/80 bg-zinc-950/70 backdrop-blur-xl z-10 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-900/70 border border-zinc-800 text-xs text-zinc-300 font-mono shadow-2xs">
            <GitBranch size={13} className="text-cyan-400" />
            <span className="text-zinc-500">Repo:</span>
            <span className="font-semibold text-zinc-100">{activeRepoName || "No active repo"}</span>
          </div>

          {/* Quick Repo Switcher Dropdown */}
          {Object.keys(repos).length > 1 && (
            <div className="relative group">
              <button className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-900/80 transition-colors">
                <span>Switch</span>
                <ChevronDown size={12} />
              </button>
              <div className="absolute left-0 top-full mt-1 w-52 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-scale-in backdrop-blur-xl">
                {Object.keys(repos).map((rName) => (
                  <button
                    key={rName}
                    onClick={() => onSwitchRepo(repos[rName])}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-zinc-300 hover:bg-cyan-950/30 hover:text-cyan-300 rounded-lg truncate transition-colors"
                  >
                    {rName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic AI Model Selector Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-zinc-900/90 to-zinc-950/90 border border-zinc-800 hover:border-cyan-500/40 text-xs text-zinc-300 font-mono transition-all shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-zinc-500">Model:</span>
              <span className="font-semibold text-zinc-100 max-w-[130px] truncate">
                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || "Auto Router"}
              </span>
              <ChevronDown size={12} className="text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            </button>
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 animate-scale-in backdrop-blur-xl">
              <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider border-b border-zinc-900 mb-1">
                Active Inference Engine
              </div>
              {AVAILABLE_MODELS.map((modelItem) => {
                const isSelected = modelItem.id === selectedModel;
                return (
                  <button
                    key={modelItem.id}
                    onClick={() => {
                      setSelectedModel(modelItem.id);
                      localStorage.setItem("devpilot_selected_model", modelItem.id);
                      toast({ type: "success", title: "Active Model Switched", description: modelItem.name });
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition-all text-left ${
                      isSelected
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-xs"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-cyan-400" : "bg-zinc-600"}`} />
                      <span className="truncate">{modelItem.name}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                      {modelItem.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800/80 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-2xs hover:scale-102"
              title="Export session as Markdown report"
            >
              <Download size={13} className="text-cyan-400" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
              showHistoryDrawer
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300 font-semibold shadow-xs"
                : "bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 shadow-2xs hover:border-zinc-700"
            }`}
          >
            <History size={13} />
            <span>History ({sessions.length})</span>
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-md shadow-cyan-500/25 border border-cyan-400/30 active:scale-95"
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Chat Scroll Container */}
        <div 
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6"
        >
          {messages.length === 0 ? (
            /* Welcome / Empty State Screen */
            <div className="max-w-3xl w-full mx-auto my-auto flex flex-col items-center text-center py-12 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-6 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Air-Gapped Local Engine</span>
                <span className="text-zinc-600">•</span>
                <span className="text-cyan-400 font-semibold">{activeRepoName || "Active Repository"}</span>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-5 shadow-xl shadow-black/40">
                <DevPilotMark size={28} className="text-cyan-400" />
              </div>

              <h2 className="font-heading text-2xl font-bold text-zinc-100 tracking-tight">
                Codebase Intelligence & Reasoning
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-2 max-w-lg leading-relaxed">
                Hybrid semantic retrieval (BM25 + FAISS + Cross-Encoder) grounded directly on local source trees.
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full mt-9 text-left">
                {promptSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(s.prompt)}
                    className="p-4 rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-zinc-900/70 via-zinc-900/40 to-zinc-950/80 hover:from-zinc-900 hover:to-cyan-950/30 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-950/25 transition-all text-left flex flex-col justify-between group duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {s.icon}
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
                        {s.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages Feed - Expansive Full-Screen Canvas */
            <div className="max-w-5xl xl:max-w-6xl w-full mx-auto flex flex-col gap-8 pb-8">
              {messages.map((m, index) => {
                const isUser = m.role === "user";

                if (isUser) {
                  return (
                    <div
                      key={m.id || index}
                      className="flex justify-end w-full animate-fade-in"
                    >
                      <div className="max-w-2xl flex flex-col items-end">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[10px] font-mono text-zinc-400">
                          <User size={11} className="text-cyan-400" />
                          <span>You</span>
                          <span>•</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <div className="rounded-2xl px-5 py-3 text-[13px] font-sans leading-relaxed bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-cyan-950/25 border border-zinc-800/90 text-zinc-100 shadow-md shadow-black/25 hover:border-cyan-500/30 transition-all">
                          <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id || index}
                    className="w-full flex flex-col pt-2 pb-6 border-b border-zinc-900/90 last:border-b-0 animate-fade-in"
                  >
                    {/* Assistant Header Bar */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/60">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-2xs">
                          <DevPilotMark size={14} className="text-cyan-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100 font-mono tracking-tight">
                            DevPilot Engine
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 font-medium">
                            Hybrid Grounded
                          </span>
                          <span className="text-zinc-600 text-xs">•</span>
                          <span className="text-[11px] font-mono text-zinc-500">{m.timestamp}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast({ type: "success", title: "Copied response markdown" });
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all shadow-2xs text-[11px] font-mono hover:scale-102"
                          title="Copy response markdown"
                        >
                          <Copy size={12} />
                          <span>Copy</span>
                        </button>

                        {index === messages.length - 1 && !loading && (
                          <button
                            onClick={() => {
                              const lastUser = [...messages].reverse().find((x) => x.role === "user");
                              if (lastUser) handleRegenerate(lastUser.content);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 border border-zinc-800 text-zinc-300 hover:text-cyan-400 transition-all shadow-2xs text-[11px] font-mono hover:scale-102"
                            title="Regenerate this response"
                          >
                            <RefreshCw size={12} className="text-cyan-400" />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading Skeleton */}
                    {m.content === "" && loading ? (
                      <div className="flex items-center gap-3 py-6 text-zinc-400 font-mono text-xs">
                        <RefreshCw size={15} className="animate-spin text-cyan-400" />
                        <span>Retrieving codebase context & synthesizing response...</span>
                      </div>
                    ) : m.content === "" ? (
                      <div className="py-4 text-zinc-400 text-xs font-mono flex items-center justify-between">
                        <span>No response received. Click Regenerate to retry.</span>
                        <button
                          onClick={() => {
                            const lastUser = [...messages].reverse().find((x) => x.role === "user");
                            if (lastUser) handleRegenerate(lastUser.content);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-colors"
                        >
                          Regenerate
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Source Citations Badges - Clickable to open File Peek Drawer */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 shadow-2xs">
                            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                              Grounding Files:
                            </span>
                            {m.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => setPeekFilePath(cite)}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-300 dark:hover:border-cyan-500/40 text-[11px] font-mono text-cyan-700 dark:text-cyan-400 transition-all cursor-pointer shadow-2xs hover:scale-102"
                                title={`Click to inspect ${cite} in File Peek Drawer`}
                              >
                                <FileCode size={11} className="text-zinc-400 dark:text-zinc-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                                <span className="group-hover:underline underline-offset-2">{cite}</span>
                                <Eye size={10} className="text-zinc-400 dark:text-zinc-600 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors ml-0.5" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Open Markdown Canvas */}
                        <div className="w-full text-zinc-800 dark:text-zinc-200 font-sans text-[13px] leading-relaxed">

                            {/* Markdown Render */}
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1({ children }) {
                                  return (
                                    <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5 pb-1.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 tracking-tight">
                                      {children}
                                    </h1>
                                  );
                                },
                                h2({ children }) {
                                  return (
                                    <h2 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-5 mb-2 flex items-center gap-2 tracking-tight">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0 shadow-sm shadow-cyan-400" />
                                      {children}
                                    </h2>
                                  );
                                },
                                h3({ children }) {
                                  return (
                                    <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-1.5 uppercase font-mono tracking-wider">
                                      {children}
                                    </h3>
                                  );
                                },
                                p({ children }) {
                                  return (
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed my-2.5 font-sans">
                                      {children}
                                    </p>
                                  );
                                },
                                ul({ children }) {
                                  return (
                                    <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 my-2.5 marker:text-cyan-600 dark:marker:text-cyan-400">
                                      {children}
                                    </ul>
                                  );
                                },
                                ol({ children }) {
                                  return (
                                    <ol className="list-decimal list-outside pl-4 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 my-2.5 marker:text-cyan-600 dark:marker:text-cyan-400 font-sans">
                                      {children}
                                    </ol>
                                  );
                                },
                                li({ children }) {
                                  return (
                                    <li className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed pl-1">
                                      {children}
                                    </li>
                                  );
                                },
                                table({ children }) {
                                  return (
                                    <div className="my-4 w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 shadow-sm">
                                      <table className="w-full text-left border-collapse text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  );
                                },
                                thead({ children }) {
                                  return (
                                    <thead className="bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-mono text-[11px]">
                                      {children}
                                    </thead>
                                  );
                                },
                                tbody({ children }) {
                                  return (
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans text-xs">
                                      {children}
                                    </tbody>
                                  );
                                },
                                tr({ children }) {
                                  return (
                                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                      {children}
                                    </tr>
                                  );
                                },
                                th({ children }) {
                                  return (
                                    <th className="px-3.5 py-2.5 font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider font-mono text-[10px] border-r border-zinc-200 dark:border-zinc-800/80 last:border-r-0">
                                      {children}
                                    </th>
                                  );
                                },
                                td({ children }) {
                                  return (
                                    <td className="px-3.5 py-2 text-zinc-700 dark:text-zinc-300 text-xs font-mono border-r border-zinc-200 dark:border-zinc-800/80 last:border-r-0">
                                      {children}
                                    </td>
                                  );
                                },
                                blockquote({ children }) {
                                  return (
                                    <blockquote className="border-l-2 border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/15 px-3.5 py-2 my-3 rounded-r-lg text-zinc-700 dark:text-zinc-300 text-xs italic font-sans leading-relaxed">
                                      {children}
                                    </blockquote>
                                  );
                                },
                                strong({ children }) {
                                  return (
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                                      {children}
                                    </strong>
                                  );
                                },
                                hr() {
                                  return <hr className="my-4 border-zinc-200 dark:border-zinc-800/80" />;
                                },
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const language = match ? match[1].toLowerCase() : "";
                                  const codeContent = String(children).replace(/\n$/, "");

                                  // Inline code snippets (e.g. `flowchart LR` inside text) must never trigger diagram render
                                  const isInline = !match && !codeContent.includes("\n");

                                  const isMermaid =
                                    !isInline &&
                                    (language === "mermaid" ||
                                      language === "flowchart" ||
                                      language === "graph" ||
                                      (/^\s*(?:Mermaid\s+Syntax:\s*)?(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)\b/i.test(codeContent) &&
                                        hasActualDiagramContent(codeContent)));

                                  if (isMermaid) {
                                    const cleanCode = codeContent.replace(/^\s*Mermaid\s+Syntax:\s*/i, "");
                                    if (!hasActualDiagramContent(cleanCode)) {
                                      return null;
                                    }
                                    return <MermaidBlock>{cleanCode}</MermaidBlock>;
                                  }

                                  if (match) {
                                    return (
                                      <CodeBlock
                                        className={className}
                                        onDiffPreview={(c) => {
                                          setDiffCode(c);
                                          setIsDiffModalOpen(true);
                                        }}
                                      >
                                        {codeContent}
                                      </CodeBlock>
                                    );
                                  }

                                  return (
                                    <code
                                      className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 text-cyan-700 dark:text-cyan-400 font-mono text-[11px] border border-zinc-200 dark:border-zinc-800 shadow-2xs"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>

                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* History Drawer Sidebar */}
        {showHistoryDrawer && (
          <aside className="w-64 border-l border-zinc-200 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 p-4 flex flex-col gap-3 shrink-0 animate-slide-in-right shadow-lg dark:shadow-2xl z-20">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-900 text-xs font-mono text-zinc-600 dark:text-zinc-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <History size={14} className="text-cyan-600 dark:text-cyan-400" />
                Conversations
              </span>
              {messages.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  title="Clear this conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {sessions.length === 0 ? (
                <div className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono py-4 text-center">
                  No saved conversations.
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = s.id === sessionId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSessionId(s.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? "bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold shadow-2xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Expandable Low-Profile Composer Footer */}
      <div className="p-4 bg-zinc-950/80 border-t border-zinc-900/80 shrink-0 backdrop-blur-2xl transition-colors duration-300">
        <div className="max-w-5xl xl:max-w-6xl w-full mx-auto relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!showSlashMenu) handleSubmit();
            }}
            className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 backdrop-blur-xl p-3 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:shadow-xl focus-within:shadow-cyan-950/30 transition-all shadow-xl shadow-black/40 relative"
          >
            {/* Quick Slash Commands Popup */}
            {showSlashMenu && (
              <SlashCommandMenu
                filter={slashFilter}
                onSelect={(cmd) => {
                  setInput(cmd.prompt);
                  setShowSlashMenu(false);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                onClose={() => setShowSlashMenu(false)}
              />
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val.startsWith("/")) {
                  setShowSlashMenu(true);
                  setSlashFilter(val);
                } else {
                  setShowSlashMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && showSlashMenu) {
                  setShowSlashMenu(false);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !showSlashMenu) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={`Ask anything about ${activeRepoName || "the active codebase"}... (Type '/' for quick commands)`}
              className="w-full bg-transparent px-3 py-2 text-[13px] font-sans text-zinc-100 placeholder:text-zinc-500 resize-none outline-none leading-relaxed min-h-[44px]"
            />

            <div className="flex items-center justify-between px-3 pt-2.5 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <GitBranch size={11} className="text-cyan-400" />
                  <span className="text-[10px] text-zinc-400 font-semibold">{activeRepoName || "devpilot-ai"}</span>
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-cyan-400 font-semibold cursor-pointer hover:underline text-[10px]" onClick={() => { setInput("/"); setShowSlashMenu(true); }}>
                  / quick actions
                </span>
                {isListening && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Listening...
                  </span>
                )}
                {input.length > 0 && !isListening && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span>{input.length} chars</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Voice Input Microphone Trigger */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={loading}
                  className={`flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
                    isListening
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse shadow-md shadow-rose-500/25 ring-2 ring-rose-500/30"
                      : "bg-gradient-to-b from-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 shadow-2xs"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Speak prompt (Voice to Text)"}
                >
                  {isListening ? (
                    <MicOff size={14} className="text-rose-400" />
                  ) : (
                    <Mic size={14} />
                  )}
                </button>

                {loading ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    <Square size={11} className="fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:hover:from-cyan-600 disabled:hover:to-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/25 active:scale-95 border border-cyan-400/20"
                  >
                    <Send size={12} />
                    <span>Send</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Code Diff Modal */}
      <DiffPreviewModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        proposedCode={diffCode}
      />

      {/* File Peek Drawer */}
      <FilePeekDrawer
        filePath={peekFilePath}
        onClose={() => setPeekFilePath(null)}
      />

      {/* Clear Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Conversation"
        description="Are you sure you want to delete this chat history? This action cannot be undone."
        confirmText="Clear History"
        isDestructive={true}
        onConfirm={handleClearSession}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
