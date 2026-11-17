import React, { useEffect, useState, useRef } from "react";
import mermaid from "mermaid";
import {
  Check,
  Copy,
  Code2,
  Eye,
  RefreshCw,
  GitFork,
  AlertCircle,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  X,
} from "lucide-react";

// Helper to configure Mermaid for obsidian dark mode
export const configureMermaidTheme = () => {
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 18,
        useMaxWidth: false,
      },
      themeVariables: {
        darkMode: true,
        background: "#09090b",
        primaryColor: "#0f172a",
        primaryTextColor: "#f8fafc",
        primaryBorderColor: "#06b6d4",
        lineColor: "#22d3ee",
        secondaryColor: "#1e1b4b",
        tertiaryColor: "#18181b",
        edgeLabelBackground: "#09090b",
        nodeBorder: "#06b6d4",
        mainBkg: "#18181b",
        actorBkg: "#18181b",
        actorBorder: "#38bdf8",
        signalColor: "#f4f4f5",
        signalLineColor: "#22d3ee",
        labelBoxBorderColor: "#38bdf8",
        labelBoxBkgColor: "#18181b",
      },
    });
  } catch (e) {
    console.error("Mermaid initialization failed:", e);
  }
};

// Initial setup with dark theme
configureMermaidTheme();

/**
 * Robust sanitizer for Mermaid code emitted by LLMs.
 * Fixes single-dash arrows (->), unquoted slashes in brackets ([/path]),
 * unquoted subgraph titles, unclosed subgraphs, and markdown code fences.
 */
export function sanitizeMermaidCode(raw: string, stripSubgraphs: boolean = false): string {
  if (!raw || !raw.trim()) return "";
  let code = raw.trim();

  // Strip markdown code fences if wrapped
  code = code.replace(/^```(?:mermaid)?\s*/i, "").replace(/```$/i, "").trim();

  // Check for valid diagram declaration
  const validStarts = [
    "flowchart",
    "graph",
    "sequencediagram",
    "classdiagram",
    "statediagram",
    "erdiagram",
    "gantt",
    "pie",
    "journey",
    "gitgraph",
  ];
  const firstLine = code.split("\n")[0].trim().toLowerCase();
  const hasValidStart = validStarts.some((start) => firstLine.startsWith(start));
  if (!hasValidStart) {
    code = "flowchart LR\n" + code;
  }

  const lines = code.split("\n");
  const sanitizedLines: string[] = [];
  let subgraphCount = 0;
  let endCount = 0;

  for (let line of lines) {
    let l = line;

    // Optional aggressive mode: strip subgraphs if they cause parsing bugs
    if (stripSubgraphs) {
      if (/^\s*subgraph\b/i.test(l) || /^\s*end\b/i.test(l)) {
        continue;
      }
    }

    // Track subgraphs & ends
    if (/^\s*subgraph\b/i.test(l)) subgraphCount++;
    if (/^\s*end\b/i.test(l)) endCount++;

    // Fix arrows: -> to -->, <- to <--
    l = l.replace(/(?<![-.=>])->(?!>)/g, "-->");
    l = l.replace(/(?<![<])<-(?![-.=<])/g, "<--");
    l = l.replace(/--\s+>/g, "-->");
    l = l.replace(/==\s+>/g, "==>");
    l = l.replace(/-\.\s+>/g, "-.->");

    // Fix unquoted subgraph titles: subgraph Frontend Layer -> subgraph "Frontend Layer"
    const subgraphMatch = l.match(/^(\s*subgraph\s+)([^"\[\n]+)$/i);
    if (subgraphMatch) {
      const prefix = subgraphMatch[1];
      const title = subgraphMatch[2].trim();
      if (title && !title.startsWith('"') && !title.endsWith('"')) {
        l = `${prefix}"${title}"`;
      }
    }

    // Fix bracket labels: NodeId[Label] -> NodeId["Label"]
    l = l.replace(/([a-zA-Z0-9_]+)\[([^\]\n]+)\]/g, (_match, id, inner) => {
      const trimmed = inner.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return `${id}[${trimmed}]`;
      }
      const cleanInner = trimmed.replace(/"/g, "'");
      return `${id}["${cleanInner}"]`;
    });

    // Fix parentheses labels with slashes or colons
    l = l.replace(/([a-zA-Z0-9_]+)\(([^)\n]+)\)/g, (_match, id, inner) => {
      const trimmed = inner.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return `${id}("${trimmed.slice(1, -1)}")`;
      }
      if (/[/\\:\-()]/.test(trimmed)) {
        const cleanInner = trimmed.replace(/"/g, "'");
        return `${id}["${cleanInner}"]`;
      }
      return `${id}("${trimmed}")`;
    });

    sanitizedLines.push(l);
  }

  // Auto-close any unclosed subgraphs
  if (!stripSubgraphs) {
    while (subgraphCount > endCount) {
      sanitizedLines.push("    end");
      endCount++;
    }
  }

  return sanitizedLines.join("\n");
}

interface MermaidBlockProps {
  children: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ children }) => {
  const [svg, setSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  // Interactive zoom & fullscreen state
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Gesture state for mouse drag & touch pinch/pan
  const gestureState = useRef({
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panStartX: 0,
    panStartY: 0,
    // Multi-touch pinch tracking
    isPinching: false,
    initialPinchDist: 0,
    initialZoom: 1,
  });

  // Trackpad pinch-to-zoom (Wheel event with ctrlKey) and two-finger pan
  useEffect(() => {
    const attachWheel = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Trackpad pinch-to-zoom produces e.ctrlKey === true
        if (e.ctrlKey) {
          const zoomDelta = -e.deltaY * 0.01;
          setZoom((prev) => {
            const next = Math.min(Math.max(prev + zoomDelta, 0.35), 4.0);
            return Number(next.toFixed(2));
          });
        } else {
          // Trackpad two-finger scroll or wheel pans the diagram
          setPan((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
        }
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    };

    const cleanup1 = attachWheel(containerRef.current);
    const cleanup2 = attachWheel(modalContainerRef.current);
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [isFullscreen]);

  // Escape key closes fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    let isMounted = true;
    configureMermaidTheme();

    const renderChart = async () => {
      if (!children.trim()) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const renderId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      try {
        // Pass 1: Standard sanitization
        const sanitized = sanitizeMermaidCode(children, false);
        const { svg: renderedSvg } = await mermaid.render(renderId, sanitized);
        if (isMounted) {
          setSvg(renderedSvg);
          setRenderError(null);
          setLoading(false);
        }
      } catch (err1: any) {
        const el = document.getElementById(renderId);
        if (el) el.remove();
        const errEl = document.getElementById(`d${renderId}`);
        if (errEl) errEl.remove();

        try {
          // Pass 2: Aggressive sanitization (strip problematic subgraphs)
          const fallbackRenderId = `mermaid-svg-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const fallbackSanitized = sanitizeMermaidCode(children, true);
          const { svg: fallbackSvg } = await mermaid.render(fallbackRenderId, fallbackSanitized);
          if (isMounted) {
            setSvg(fallbackSvg);
            setRenderError(null);
            setLoading(false);
          }
        } catch (err2: any) {
          const fallbackEl = document.getElementById(renderId);
          if (fallbackEl) fallbackEl.remove();
          const fallbackErrEl = document.getElementById(`d${renderId}`);
          if (fallbackErrEl) fallbackErrEl.remove();

          if (isMounted) {
            setRenderError(err2?.message || err1?.message || "Syntax parse error");
            setLoading(false);
          }
        }
      }
    };

    const timer = setTimeout(() => {
      renderChart();
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [children, retryNonce]);

  const handleCopy = () => {
    const textToCopy = sanitizeMermaidCode(children, false);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDownloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devpilot-architecture-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    gestureState.current.isDragging = true;
    gestureState.current.dragStartX = e.clientX;
    gestureState.current.dragStartY = e.clientY;
    gestureState.current.panStartX = pan.x;
    gestureState.current.panStartY = pan.y;
    setIsInteracting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!gestureState.current.isDragging) return;
    const dx = e.clientX - gestureState.current.dragStartX;
    const dy = e.clientY - gestureState.current.dragStartY;
    setPan({
      x: gestureState.current.panStartX + dx,
      y: gestureState.current.panStartY + dy,
    });
  };

  const handleMouseUp = () => {
    gestureState.current.isDragging = false;
    setIsInteracting(false);
  };

  // Touch gestures: Pinch with 2 fingers to zoom (chhota/bada), Drag with 1 finger to move
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: Pinch to zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      gestureState.current.isPinching = true;
      gestureState.current.initialPinchDist = dist;
      gestureState.current.initialZoom = zoom;
      gestureState.current.isDragging = false;
      setIsInteracting(true);
    } else if (e.touches.length === 1) {
      // 1 finger: Drag / pan
      const t = e.touches[0];
      gestureState.current.isDragging = true;
      gestureState.current.dragStartX = t.clientX;
      gestureState.current.dragStartY = t.clientY;
      gestureState.current.panStartX = pan.x;
      gestureState.current.panStartY = pan.y;
      gestureState.current.isPinching = false;
      setIsInteracting(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && gestureState.current.isPinching) {
      // Two-finger pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (gestureState.current.initialPinchDist > 0) {
        const factor = dist / gestureState.current.initialPinchDist;
        const newZoom = Math.min(Math.max(gestureState.current.initialZoom * factor, 0.35), 4.0);
        setZoom(Number(newZoom.toFixed(2)));
      }
    } else if (e.touches.length === 1 && gestureState.current.isDragging) {
      // Single-finger drag
      const t = e.touches[0];
      const dx = t.clientX - gestureState.current.dragStartX;
      const dy = t.clientY - gestureState.current.dragStartY;
      setPan({
        x: gestureState.current.panStartX + dx,
        y: gestureState.current.panStartY + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      gestureState.current.isDragging = false;
      gestureState.current.isPinching = false;
      setIsInteracting(false);
    } else if (e.touches.length === 1) {
      // Switched from 2 fingers to 1 finger
      const t = e.touches[0];
      gestureState.current.isPinching = false;
      gestureState.current.isDragging = true;
      gestureState.current.dragStartX = t.clientX;
      gestureState.current.dragStartY = t.clientY;
      gestureState.current.panStartX = pan.x;
      gestureState.current.panStartY = pan.y;
    }
  };

  return (
    <>
      {/* Standard In-line Diagram Card */}
      <div className="my-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 overflow-hidden bg-white dark:bg-zinc-950/90 backdrop-blur-md shadow-md dark:shadow-2xl transition-all">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono gap-2">
          <div className="flex items-center gap-2 font-medium text-cyan-600 dark:text-cyan-400">
            <GitFork size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span className="tracking-wide uppercase font-semibold text-[10px]">
              System Architecture Flowchart
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Zoom Controls */}
            {!showCode && svg && (
              <div className="flex items-center bg-white dark:bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700/60 mr-1 shadow-2xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-500 dark:text-zinc-400 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="px-1.5 text-[10px] text-zinc-700 dark:text-zinc-300 font-mono select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-500 dark:text-zinc-400 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={12} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-500 dark:text-zinc-400 rounded transition-colors border-l border-zinc-200 dark:border-zinc-700/60 ml-0.5"
                  title="Reset Zoom"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            )}

            {/* Fullscreen Expand Button */}
            {!showCode && svg && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 border border-cyan-200 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 transition-colors text-[10px] font-medium"
                title="Expand to Fullscreen View"
              >
                <Maximize2 size={11} />
                <span>Fullscreen</span>
              </button>
            )}

            {/* Code / Diagram Toggle */}
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-transparent transition-colors text-[10px]"
              title={showCode ? "Switch to Flowchart View" : "View Mermaid Code"}
            >
              {showCode ? <Eye size={11} className="text-cyan-600 dark:text-cyan-400" /> : <Code2 size={11} className="text-cyan-600 dark:text-cyan-400" />}
              <span>{showCode ? "Diagram" : "Code"}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-transparent transition-colors text-[10px]"
              title="Copy Mermaid source"
            >
              {copied ? <Check size={11} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={11} className="text-zinc-400" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            {renderError && (
              <button
                onClick={() => setRetryNonce((n) => n + 1)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px]"
                title="Retry rendering diagram"
              >
                <RefreshCw size={11} className="text-cyan-600 dark:text-cyan-400" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* In-line Content Area */}
        {showCode ? (
          <div className="p-4 bg-zinc-950 font-mono text-xs overflow-x-auto text-zinc-300 leading-relaxed max-h-[480px]">
            <pre>{sanitizeMermaidCode(children, false)}</pre>
          </div>
        ) : loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2.5 text-zinc-500 font-mono text-xs min-h-[180px]">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Synthesizing visual flowchart...</span>
          </div>
        ) : renderError && !svg ? (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950/90 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-2 font-medium text-[11px]">
              <AlertCircle size={14} />
              <span>Diagram Syntax Notice (Interactive fallback below)</span>
            </div>
            <div className="p-3 my-2 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {sanitizeMermaidCode(children, false)}
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="p-6 select-none overflow-x-auto overflow-y-hidden flex justify-center bg-zinc-950/90 min-h-[280px] max-h-[580px] cursor-grab active:cursor-grabbing transition-colors"
            style={{ touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <style>{`
              .devpilot-mermaid-svg {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
              }
              .devpilot-mermaid-svg svg {
                background: transparent !important;
                max-width: none !important;
                height: auto !important;
              }
              .devpilot-mermaid-svg svg text {
                font-family: 'JetBrains Mono', ui-monospace, monospace !important;
                font-size: 13px !important;
                fill: #f8fafc !important;
              }
              .devpilot-mermaid-svg .node rect,
              .devpilot-mermaid-svg .node circle,
              .devpilot-mermaid-svg .node polygon {
                stroke: #06b6d4 !important;
                stroke-width: 1.5px !important;
                fill: #18181b !important;
              }
              .devpilot-mermaid-svg .flowchart-link {
                stroke: #22d3ee !important;
                stroke-width: 1.8px !important;
              }
              .devpilot-mermaid-svg .marker {
                fill: #22d3ee !important;
                stroke: #22d3ee !important;
              }
            `}</style>
            <div
              className="devpilot-mermaid-svg"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center",
                transition: isInteracting ? "none" : "transform 0.15s ease-out",
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}

        {/* Footer Hint */}
        {!showCode && svg && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/40 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-500">
            <span>Pinch with 2 fingers to zoom • Drag with 1 finger to pan</span>
            <button
              onClick={() => setIsFullscreen(true)}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>Click to view Fullscreen</span>
              <Maximize2 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Interactive Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-100/98 dark:bg-zinc-950/98 backdrop-blur-2xl flex flex-col animate-scale-in">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <GitFork size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                  System Architecture Flowchart — Full Screen Explorer
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">
                  Interactive multi-tier workflow & component diagram
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-600 dark:text-zinc-400 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="px-2 text-xs text-zinc-800 dark:text-zinc-200 font-mono select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-600 dark:text-zinc-400 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 text-zinc-600 dark:text-zinc-400 rounded transition-colors border-l border-zinc-200 dark:border-zinc-700 ml-1"
                  title="Reset Zoom & Pan"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Download SVG */}
              <button
                onClick={handleDownloadSvg}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-mono transition-colors shadow-2xs"
                title="Download SVG vector file"
              >
                <Download size={13} className="text-cyan-600 dark:text-cyan-400" />
                <span>Export SVG</span>
              </button>

              {/* Copy Code */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-mono transition-colors shadow-2xs"
              >
                {copied ? <Check size={13} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={13} className="text-zinc-400" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                title="Close Fullscreen (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Fullscreen Canvas */}
          <div
            ref={modalContainerRef}
            className="flex-1 overflow-hidden p-12 flex items-center justify-center cursor-grab active:cursor-grabbing bg-zinc-950 select-none relative"
            style={{ touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* Grid Pattern Background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: "radial-gradient(#22d3ee 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <div
              className="devpilot-mermaid-svg relative z-10"
              style={{
                transform: `scale(${zoom * 1.2}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center",
                transition: isInteracting ? "none" : "transform 0.15s ease-out",
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          {/* Modal Bottom Bar */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/90 border-t border-zinc-800 text-xs font-mono text-zinc-500">
            <span>Pinch with 2 fingers to zoom • Drag to pan diagram • Press ESC to exit</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              <Minimize2 size={12} />
              <span>Exit Fullscreen</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
