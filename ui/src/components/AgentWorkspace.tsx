import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Play, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  Code2, 
  FileCode, 
  Copy, 
  Check, 
  Eye, 
  Workflow,
  Layers,
  Wrench,
  ChevronRight,
  Mic,
  MicOff
} from "lucide-react";
import { streamAgentRun, fetchAgentPlan, type AgentStep } from "../utils/api";
import { DiffPreviewModal } from "./DiffPreviewModal";
import { MermaidBlock, hasActualDiagramContent } from "./MermaidBlock";
import { useToast } from "./ui/Toast";

interface AgentWorkspaceProps {
  activeRepoName: string;
}

interface StepNode {
  id: string;
  name: string;
  role: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  tools?: string[];
}

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ activeRepoName }) => {
  const { toast } = useToast();
  const [taskQuery, setTaskQuery] = useState("");
  const [executing, setExecuting] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Agent Pipeline Nodes
  const defaultNodes: StepNode[] = [
    { id: "planner", name: "Planner Agent", role: "Architecture & Task Decomposition", status: "pending" },
    { id: "coder", name: "Coder Agent", role: "Implementation & Code Synthesis", status: "pending" },
    { id: "reviewer", name: "Reviewer Agent", role: "Quality, Standards & Edge Cases", status: "pending" },
    { id: "debugger", name: "Debugger Agent", role: "Vulnerabilities & Exception Handling", status: "pending" },
    { id: "executor", name: "Executor Agent", role: "Sandbox Verification & Diff Synthesis", status: "pending" },
  ];

  const [nodes, setNodes] = useState<StepNode[]>(defaultNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("planner");
  const [rawSteps, setRawSteps] = useState<AgentStep[]>([]);
  const [finalOutput, setFinalOutput] = useState<string>("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [diffCode, setDiffCode] = useState("");
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<any[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
        title: "Voice Unavailable",
        description: "Your browser does not support speech recognition.",
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
        toast({ type: "info", title: "Microphone Active", description: "Speak task description..." });
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setTaskQuery(transcript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Timer for execution elapsed time
  useEffect(() => {
    let timer: any;
    if (executing && startTime) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [executing, startTime]);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setExecuting(false);
      toast({ type: "info", title: "Execution Stopped", description: "Multi-agent loop aborted by user" });
    }
  };

  const handlePreviewPlan = async () => {
    if (!taskQuery.trim()) {
      toast({ type: "warning", title: "Query Required", description: "Enter a task description to preview plan" });
      return;
    }
    setPlanLoading(true);
    try {
      const res = await fetchAgentPlan(taskQuery.trim());
      if (res.error) {
        toast({ type: "error", title: "Plan Error", description: res.error });
      } else {
        setPreviewPlan(res.steps);
        toast({ type: "success", title: "Plan Synthesized", description: `Architected ${res.steps.length} sequential steps` });
      }
    } catch (e: any) {
      toast({ type: "error", title: "Plan Failed", description: e.message || "Failed to contact planner" });
    } finally {
      setPlanLoading(false);
    }
  };

  const handleRun = async () => {
    if (!taskQuery.trim() || executing) return;

    setExecuting(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setFinalOutput("");
    setRawSteps([]);
    setPreviewPlan(null);

    // Initialize all nodes to pending, planner to running
    setNodes(
      defaultNodes.map((n, idx) => ({
        ...n,
        status: idx === 0 ? "running" : "pending",
        output: undefined,
        tools: undefined,
      }))
    );
    setSelectedNodeId("planner");

    const controller = new AbortController();
    setAbortController(controller);

    const accumulatedSteps: AgentStep[] = [];

    await streamAgentRun(
      taskQuery.trim(),
      (step) => {
        accumulatedSteps.push(step);
        setRawSteps([...accumulatedSteps]);

        // Map step to node
        setNodes((prevNodes) => {
          const next = [...prevNodes];
          const matchedIdx = next.findIndex(
            (n) => n.id.toLowerCase() === step.agent.toLowerCase()
          );

          if (matchedIdx !== -1) {
            next[matchedIdx] = {
              ...next[matchedIdx],
              status:
                step.status === "error" || step.status === "failed"
                  ? "failed"
                  : "completed",
              output: step.output,
              tools: step.tools_used,
            };

            // Automatically advance next node to running if exists
            if (matchedIdx + 1 < next.length && next[matchedIdx].status === "completed") {
              next[matchedIdx + 1] = {
                ...next[matchedIdx + 1],
                status: "running",
              };
            }
          }
          return next;
        });

        // Set selected node to the currently active one
        setSelectedNodeId(step.agent.toLowerCase());
        setFinalOutput(step.output);
      },
      () => {
        setExecuting(false);
        setAbortController(null);
        toast({ type: "success", title: "Execution Completed", description: "Multi-agent pipeline succeeded" });
      },
      (err) => {
        setExecuting(false);
        setAbortController(null);
        toast({ type: "error", title: "Execution Failed", description: String(err.message || err) });
      },
      undefined,
      controller.signal
    );
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const presetTasks = [
    {
      title: "Implement Rate Limiting",
      query: "Implement a Redis-backed rate limiting middleware for API endpoints with custom tier limits.",
    },
    {
      title: "Add Unit & Safety Tests",
      query: "Write a comprehensive suite of unit tests for the security guardrails and prompt injection interceptor.",
    },
    {
      title: "Refactor Memory Service",
      query: "Refactor the session memory service to support semantic conversation pruning and SQLite backup.",
    },
    {
      title: "Audit Security & Auth",
      query: "Audit the repository for leaked tokens, unprotected endpoints, and input injection vulnerabilities.",
    },
  ];

  // Extract any code block from final output for diff preview
  const extractedCodeMatch = /```(?:python|ts|js|jsx|tsx|json)?\n([\s\S]*?)```/i.exec(finalOutput);
  const candidateCode = extractedCodeMatch ? extractedCodeMatch[1] : "";

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative transition-colors duration-300 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-2xs">
              <Workflow size={16} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm text-zinc-100 flex items-center gap-2">
                Multi-Agent Synthesis Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium">
                  CLOSED-LOOP ARCHITECTURE
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">
                Sequential Pipeline: Planner → Coder → Reviewer → Debugger → Executor
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {executing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-2xs">
              <Clock size={13} className="animate-spin text-cyan-400" />
              <span>Elapsed: {elapsedSeconds}s</span>
            </div>
          )}

          {candidateCode && (
            <button
              onClick={() => {
                setDiffCode(candidateCode);
                setIsDiffModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-zinc-200 hover:border-cyan-500/40 hover:text-cyan-300 transition-all shadow-2xs"
            >
              <FileCode size={13} className="text-cyan-400" />
              <span>Review Diff</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Task Composer & Pipeline Timeline */}
        <div className="w-1/2 border-r border-zinc-900 flex flex-col p-6 overflow-y-auto gap-6 bg-zinc-950/40">
          {/* Task Composer Box */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Terminal size={14} className="text-cyan-400" />
                Engineering Task Description
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={executing}
                  className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                    isListening
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse ring-1 ring-rose-500/30"
                      : "text-zinc-400 hover:text-cyan-400 border-zinc-800 bg-zinc-900/60"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Speak task description (Voice to Text)"}
                >
                  {isListening ? <MicOff size={12} className="text-rose-400" /> : <Mic size={12} />}
                  <span>{isListening ? "Listening..." : "Voice"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPlan}
                  disabled={executing || planLoading || !taskQuery.trim()}
                  className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 disabled:opacity-40"
                >
                  <Eye size={12} />
                  <span>{planLoading ? "Analyzing..." : "Preview Plan"}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              placeholder="Describe the feature to implement, bug to fix, or architectural refactor..."
              disabled={executing}
              className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-cyan-500 outline-none resize-none leading-relaxed"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetTasks.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTaskQuery(p.query)}
                  disabled={executing}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800/80 transition-colors shadow-2xs"
                >
                  {p.title}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
              <span className="text-[10px] font-mono text-zinc-500">
                Workspace: <strong className="text-zinc-800 dark:text-zinc-300">{activeRepoName || "None"}</strong>
              </span>

              <div className="flex items-center gap-2">
                {executing ? (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    <Square size={13} className="fill-current" />
                    <span>Cancel Pipeline</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRun}
                    disabled={!taskQuery.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:hover:from-cyan-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30 active:scale-95"
                  >
                    <Play size={13} className="fill-current" />
                    <span>Execute Multi-Agent</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Plan Preview (if requested) */}
          {previewPlan && previewPlan.length > 0 && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4 space-y-2 animate-in fade-in duration-200">
              <div className="text-xs font-semibold text-cyan-400 flex items-center gap-2">
                <Layers size={14} />
                <span>Planned Execution Sequence ({previewPlan.length} Steps)</span>
              </div>
              <div className="space-y-1.5">
                {previewPlan.map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-zinc-200 uppercase">
                        Agent: {s.agent}
                      </div>
                      <div className="text-zinc-400 text-[11px] font-sans mt-0.5">
                        {s.instruction}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-Time Agent Execution Pipeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Terminal size={14} className="text-cyan-400" />
                Agent Pipeline Execution Timeline
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {rawSteps.length} of {nodes.length} Steps Complete
              </span>
            </div>

            <div className="space-y-2">
              {nodes.map((node, idx) => {
                const isSelected = selectedNodeId === node.id;
                const statusBadge =
                  node.status === "completed" ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 size={11} /> Done
                    </span>
                  ) : node.status === "running" ? (
                    <span className="flex items-center gap-1 text-cyan-400 text-[10px] font-mono bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/40 animate-pulse">
                      <Clock size={11} className="animate-spin" /> Running
                    </span>
                  ) : node.status === "failed" ? (
                    <span className="flex items-center gap-1 text-rose-400 text-[10px] font-mono bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                      <XCircle size={11} /> Error
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px] font-mono bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      Pending
                    </span>
                  );

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/40 shadow-md shadow-cyan-500/5"
                        : "bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        isSelected ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                          <span>{node.name}</span>
                          {node.name.includes("self-heal") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                              🔄 Self-Heal
                            </span>
                          )}
                          {node.name.includes("verify") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                              🛡️ Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {node.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {statusBadge}
                      <ChevronRight size={14} className="text-zinc-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Agent Inspector & Log Output */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-950 overflow-hidden">
          {/* Inspector Header */}
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between shrink-0">
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                <Code2 size={15} className="text-cyan-400" />
                <span>{selectedNode.name} Inspector</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  ({selectedNode.status})
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                {selectedNode.role}
              </div>
            </div>

            {selectedNode.output && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedNode.output || "");
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                  toast({ type: "success", title: "Output Copied" });
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800"
              >
                {codeCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{codeCopied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          {/* Tools Used Badge Bar */}
          {selectedNode.tools && selectedNode.tools.length > 0 && (
            <div className="px-4 py-2 border-b border-zinc-900/80 bg-zinc-950/80 flex items-center gap-2 text-xs font-mono">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Wrench size={11} /> Tools Dispatched:
              </span>
              {selectedNode.tools.map((t, tIdx) => (
                <span
                  key={tIdx}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed text-zinc-300">
            {selectedNode.output ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1({ children }) {
                    return (
                      <h1 className="text-base font-bold text-zinc-100 mt-5 mb-2.5 pb-1.5 border-b border-zinc-800 flex items-center gap-2 tracking-tight">
                        {children}
                      </h1>
                    );
                  },
                  h2({ children }) {
                    return (
                      <h2 className="text-sm font-bold text-cyan-400 mt-5 mb-2 flex items-center gap-2 tracking-tight">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-sm shadow-cyan-400" />
                        {children}
                      </h2>
                    );
                  },
                  h3({ children }) {
                    return (
                      <h3 className="text-xs font-semibold text-zinc-200 mt-4 mb-1.5 uppercase font-mono tracking-wider">
                        {children}
                      </h3>
                    );
                  },
                  p({ children }) {
                    return (
                      <p className="text-xs text-zinc-300 leading-relaxed my-2.5 font-sans">
                        {children}
                      </p>
                    );
                  },
                  ul({ children }) {
                    return (
                      <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs text-zinc-300 my-2.5 marker:text-cyan-400">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }) {
                    return (
                      <ol className="list-decimal list-outside pl-4 space-y-1.5 text-xs text-zinc-300 my-2.5 marker:text-cyan-400 font-sans">
                        {children}
                      </ol>
                    );
                  },
                  li({ children }) {
                    return (
                      <li className="text-xs text-zinc-300 leading-relaxed pl-1">
                        {children}
                      </li>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="my-4 w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-md">
                        <table className="w-full text-left border-collapse text-xs">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return (
                      <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 font-mono text-[11px]">
                        {children}
                      </thead>
                    );
                  },
                  tbody({ children }) {
                    return (
                      <tbody className="divide-y divide-zinc-800/60 font-sans text-xs">
                        {children}
                      </tbody>
                    );
                  },
                  tr({ children }) {
                    return (
                      <tr className="hover:bg-zinc-900/40 transition-colors">
                        {children}
                      </tr>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-3.5 py-2.5 font-semibold text-cyan-400 uppercase tracking-wider font-mono text-[10px] border-r border-zinc-800/80 last:border-r-0">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-3.5 py-2 text-zinc-300 text-xs font-mono border-r border-zinc-800/80 last:border-r-0">
                        {children}
                      </td>
                    );
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-2 border-cyan-500 bg-cyan-950/15 px-3.5 py-2 my-3 rounded-r-lg text-zinc-300 text-xs italic font-sans leading-relaxed">
                        {children}
                      </blockquote>
                    );
                  },
                  code({ className, children }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match ? match[1].toLowerCase() : "code";
                    const content = String(children).replace(/\n$/, "");

                    const isInline = !match && !content.includes("\n");

                    const isMermaid =
                      !isInline &&
                      (lang === "mermaid" ||
                        lang === "flowchart" ||
                        lang === "graph" ||
                        (/^\s*(?:Mermaid\s+Syntax:\s*)?(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)\b/i.test(content) &&
                          hasActualDiagramContent(content)));

                    if (isMermaid) {
                      const cleanCode = content.replace(/^\s*Mermaid\s+Syntax:\s*/i, "");
                      if (!hasActualDiagramContent(cleanCode)) {
                        return null;
                      }
                      return <MermaidBlock>{cleanCode}</MermaidBlock>;
                    }

                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-zinc-950 text-cyan-400 font-mono text-[11px] border border-zinc-800">
                          {content}
                        </code>
                      );
                    }

                    return (
                      <div className="my-3 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 font-mono">
                          <span className="text-cyan-400 uppercase font-semibold">{lang}</span>
                          <button
                            onClick={() => {
                              setDiffCode(content);
                              setIsDiffModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          >
                            <FileCode size={11} className="text-cyan-400" />
                            <span>Preview Diff</span>
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-x-auto text-zinc-200">
                          <code>{content}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {selectedNode.output}
              </ReactMarkdown>
            ) : selectedNode.status === "running" ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-3">
                <Clock size={24} className="animate-spin text-cyan-400" />
                <span>Agent is actively executing tasks and reasoning...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-2">
                <Terminal size={24} />
                <span>Waiting for execution turn in the pipeline.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Diff Preview Modal */}
      <DiffPreviewModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        proposedCode={diffCode}
      />
    </div>
  );
};
