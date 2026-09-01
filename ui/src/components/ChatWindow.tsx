import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, User, Cpu, Check, Copy, Loader2, Sparkles, FileCode } from "lucide-react";
import { streamAsk, streamAgentRun } from "../utils/api";
import type { AgentStep } from "../utils/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DiffPreviewModal } from "./DiffPreviewModal";
import mermaid from "mermaid";

interface Message {
  role: "user" | "assistant";
  content: string;
  agentSteps?: AgentStep[];
}

interface ChatWindowProps {
  mode: "ask" | "agent";
}

// Initialize mermaid once outside
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
      background: "#09090b", // zinc-950
      primaryColor: "#06b6d4", // cyan-500
      primaryTextColor: "#f4f4f5", // zinc-100
      lineColor: "#27272a", // zinc-800
      nodeBorder: "#3f3f46", // zinc-700
      mainBkg: "#18181b", // zinc-900
      actorBkg: "#18181b",
      actorBorder: "#3f3f46",
      signalColor: "#f4f4f5",
      signalLineColor: "#27272a",
      labelBoxBorderColor: "#3f3f46",
      labelBoxBkgColor: "#18181b",
    }
  });
} catch (e) {
  console.error("Mermaid initialization failed:", e);
}

// Mermaid Flowchart Rendering Component
const MermaidBlock: React.FC<{ children: string }> = ({ children }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const elementId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!children.trim()) return;
      try {
        const cleanCode = children.trim();
        const { svg: renderedSvg } = await mermaid.render(elementId.current, cleanCode);
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        // Clean up fallback ID if generated element got stuck in document
        const element = document.getElementById(elementId.current);
        if (element) {
          element.remove();
        }
        if (isMounted) {
          setError(err.message || String(err));
        }
      }
    };

    const timer = setTimeout(() => {
      renderChart();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [children]);

  if (error && !svg) {
    return (
      <div className="my-4 rounded-lg border border-zinc-800/80 overflow-hidden bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2 font-mono uppercase tracking-wider font-semibold">
          <span>Flowchart (Streaming / Error)</span>
        </div>
        <pre className="text-[11px] text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-zinc-850 overflow-hidden bg-zinc-950 p-6 flex flex-col items-center justify-center min-h-[120px] text-zinc-500 font-mono text-xs">
        <div className="animate-pulse flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          <span>Generating flowchart...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-5 rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-900/10 backdrop-blur-md shadow-lg transition-all hover:border-zinc-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold">
        <span>Visual Flowchart</span>
      </div>
      <style>{`
        .mermaid-svg-container {
          overflow-x: auto;
          width: 100%;
          background-color: rgba(9, 9, 11, 0.4);
          padding: 1.5rem;
          text-align: center;
        }
        .mermaid-svg-container svg {
          background: transparent !important;
          max-width: 100% !important;
          height: auto !important;
          display: inline-block;
        }
      `}</style>
      <div 
        className="select-none mermaid-svg-container"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

// Copy Code & Diff Preview Helper Component
const CodeBlock: React.FC<{ children: string; className?: string; onDiffPreview?: (code: string) => void }> = ({
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
    <div className="relative my-4 group rounded-lg overflow-hidden border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-[10px] text-zinc-500 font-mono">
        <span className="uppercase tracking-wider font-semibold">{lang}</span>
        <div className="flex items-center gap-2">
          {onDiffPreview && (
            <button
              onClick={() => onDiffPreview(children)}
              className="hover:text-cyan-400 text-zinc-400 transition-colors flex items-center gap-1 py-1 px-1.5 rounded"
              title="Preview Git Diff & Apply to File"
            >
              <FileCode size={11} className="text-cyan-400" />
              <span>Preview Diff</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="hover:text-zinc-300 transition-colors flex items-center gap-1 py-1 px-1.5 rounded"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-400 animate-in fade-in zoom-in-50" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="p-4 bg-zinc-950 overflow-x-auto text-[12px] font-mono text-zinc-300 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ mode }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentAgentSteps, setCurrentAgentSteps] = useState<AgentStep[]>([]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffCode, setDiffCode] = useState("");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpenDiffPreview = (code: string) => {
    setDiffCode(code);
    setIsDiffModalOpen(true);
  };

  // Auto-scrolling
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      // Find the scroll viewport container of shadcn scroll-area
      const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth"
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAgentSteps, loading]);

  // Handle modes switching - clear messages
  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
    setCurrentAgentSteps([]);
  }, [mode]);

  // Adjust input text area height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight - 12, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input;
    setInput("");
    setLoading(true);
    setCurrentAgentSteps([]);

    // Add user message
    const userMsg: Message = { role: "user", content: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    if (mode === "ask") {
      // Add empty placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      await streamAsk(
        userPrompt,
        (token) => {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            const lastIdx = next.length - 1;
            const last = next[lastIdx];
            if (last && last.role === "assistant") {
              next[lastIdx] = {
                ...last,
                content: last.content + token,
              };
            }
            return next;
          });
        },
        (error) => {
          console.error(error);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            const lastIdx = next.length - 1;
            const last = next[lastIdx];
            if (last && last.role === "assistant") {
              next[lastIdx] = {
                ...last,
                content: last.content + `\n\n*Error streaming response: ${error.message || error}*`,
              };
            }
            return next;
          });
          setLoading(false);
        }
      );
      setLoading(false);
    } else {
      // Agent mode - use local accumulator to avoid stale closure issues and render dependencies
      const accumulatedSteps: AgentStep[] = [];
      setMessages((prev) => [...prev, { role: "assistant", content: "", agentSteps: [] }]);

      await streamAgentRun(
        userPrompt,
        (step) => {
          const existingIndex = accumulatedSteps.findIndex((s) => s.agent === step.agent);
          if (existingIndex > -1) {
            accumulatedSteps[existingIndex] = step;
          } else {
            accumulatedSteps.push(step);
          }
          setCurrentAgentSteps([...accumulatedSteps]);
        },
        () => {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            const lastIdx = next.length - 1;
            const last = next[lastIdx];
            if (last && last.role === "assistant") {
              next[lastIdx] = {
                ...last,
                agentSteps: [...accumulatedSteps],
                content: accumulatedSteps.length > 0 ? accumulatedSteps[accumulatedSteps.length - 1].output : "Agent execution finished with no logs.",
              };
            }
            return next;
          });
          setLoading(false);
        },
        (error) => {
          console.error(error);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            const lastIdx = next.length - 1;
            const last = next[lastIdx];
            if (last && last.role === "assistant") {
              next[lastIdx] = {
                ...last,
                content: `*Error running agent system: ${error.message || error}*`,
              };
            }
            return next;
          });
          setLoading(false);
        }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-zinc-950/20">
      {messages.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col justify-center px-10 max-w-2xl mx-auto relative select-none w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="absolute top-1/4 left-0 w-80 h-80 bg-radial from-cyan-500/5 to-transparent blur-2xl pointer-events-none"></div>
          
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-zinc-800 leading-tight mb-8">
            Analyze. Code. Orchestrate.<br />
            Ask anything about <span className="text-cyan-500/90 font-black">your codebase.</span>
          </h1>

          <div className="space-y-4">
            <div className="flex items-center gap-3.5 text-zinc-500 text-sm hover:text-zinc-400 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
              <span>Index a local folder or remote Github repo in "Manage Repos" to begin</span>
            </div>
            <div className="flex items-center gap-3.5 text-zinc-500 text-sm hover:text-zinc-400 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
              <span>RAG Mode retrieves precise context to answer code questions</span>
            </div>
            <div className="flex items-center gap-3.5 text-zinc-500 text-sm hover:text-zinc-400 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
              <span>Agent Mode runs Planner, Coder, and Executor pipeline to solve tasks</span>
            </div>
          </div>
        </div>
      ) : (
        /* Messages ScrollArea */
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
          <div className="flex flex-col">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLast = index === messages.length - 1;
              const steps = msg.agentSteps || (isLast ? currentAgentSteps : undefined);

              return (
                <div
                  key={index}
                  className={`flex gap-5 border-b border-zinc-900/60 transition-all ${
                    isUser
                      ? "bg-zinc-900/10 px-10 py-6 border-zinc-900/40"
                      : "bg-transparent px-10 py-7"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-md ${
                      isUser
                        ? "bg-zinc-950 border-zinc-800 text-cyan-400"
                        : "bg-zinc-900 border-zinc-800 text-cyan-500 animate-in spin-in-12 duration-300"
                    }`}
                  >
                    {isUser ? <User size={15} /> : <Cpu size={15} />}
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    {/* Render expandable agent step accordion */}
                    {!isUser && steps && steps.length > 0 && (
                      <div className="w-full max-w-3xl mb-5 mt-1 border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/20 backdrop-blur-md">
                        <Accordion className="w-full">
                          {steps.map((step, sIdx) => (
                            <AccordionItem value={`step-${sIdx}`} key={sIdx} className="border-b border-zinc-800/80 last:border-b-0">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline text-xs flex items-center justify-between font-mono bg-zinc-950/20 hover:bg-zinc-950/40 transition-all">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    step.status === "success" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" :
                                    step.status === "running" ? "bg-cyan-500 animate-pulse" : "bg-rose-500"
                                  }`} />
                                  <span className="capitalize font-semibold text-zinc-300">{step.agent}</span>
                                  <span className="text-zinc-500 text-[10px]">· {step.status}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-3 pt-3 border-t border-zinc-900/60 font-mono text-[11px] text-zinc-400 bg-zinc-950/70 max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                {step.output}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}

                    {/* Loading status indicator for Agent System */}
                    {!isUser && isLast && loading && mode === "agent" && (
                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mt-1 mb-4">
                        <Loader2 size={12} className="animate-spin text-cyan-500" />
                        <span>Orchestrating AI planning, coding, and debugging agents...</span>
                      </div>
                    )}

                    {/* Markdown Body Text */}
                    {msg.content ? (
                      <div className="message-markdown animate-in fade-in duration-300 leading-relaxed text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre: ({ children }) => <div>{children}</div>,
                            code: ({ node, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || "");
                              if (match && match[1] === "mermaid") {
                                return (
                                  <MermaidBlock>
                                    {String(children).replace(/\n$/, "")}
                                  </MermaidBlock>
                                );
                              }
                              return match ? (
                                <CodeBlock className={className} onDiffPreview={handleOpenDiffPreview} {...props}>
                                  {String(children).replace(/\n$/, "")}
                                </CodeBlock>
                              ) : (
                                <code className="bg-zinc-900 border border-zinc-800 text-cyan-400/90 text-xs px-1.5 py-0.5 rounded font-mono" {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      !isUser && isLast && (
                        <div className="flex items-center gap-1">
                          <span className="cursor" />
                          <span className="text-zinc-600 text-xs font-mono">Thinking...</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Input area */}
      <div className="bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent border-t border-zinc-900/80 px-10 py-5">
        <form className="max-w-3xl mx-auto flex bg-zinc-900/60 border border-zinc-850 rounded-xl transition-all focus-within:border-cyan-500/35 focus-within:ring-2 focus-within:ring-cyan-500/10 items-end p-2.5 shadow-xl" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 border-none bg-transparent text-zinc-100 font-sans text-[14px] leading-relaxed resize-none min-h-[24px] max-h-[160px] px-3.5 py-2.5 outline-none placeholder:text-zinc-500 font-medium"
            placeholder={
              mode === "ask" ? "Ask anything about your codebase…" : "Describe a coding objective to execute…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg w-9 h-9 flex items-center justify-center shrink-0 mb-1"
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin text-zinc-950" /> : <Send size={14} />}
          </Button>
        </form>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-600 font-mono uppercase mt-2.5 tracking-wider select-none">
          <Sparkles size={8} />
          Powered by OpenRouter LLM Gateway
        </div>
      </div>

      {/* Diff Preview & Workspace File Apply Modal */}
      <DiffPreviewModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        proposedCode={diffCode}
      />
    </div>
  );
};
