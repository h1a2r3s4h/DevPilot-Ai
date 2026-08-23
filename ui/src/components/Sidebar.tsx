import React from "react";
import { MessageSquare, Bot, Database, Server } from "lucide-react";

interface SidebarProps {
  activeMode: string;
  setActiveMode: (mode: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMode, setActiveMode }) => {
  return (
    <aside className="w-80 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col p-6 flex-shrink-0 z-10 select-none">
      {/* Pulse Glowing Animated Logo */}
      <div className="flex items-center gap-3.5 mb-1.5">
        <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-lg blur-md animate-pulse"></div>
          <svg className="w-8 h-8 relative z-10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer Hexagon */}
            <polygon 
              points="16,2 30,10 30,22 16,30 2,22 2,10" 
              className="stroke-cyan-500/15 fill-cyan-500/5 stroke-[1]" 
            />

            {/* Orbiting Code Nodes */}
            <circle cx="16" cy="2" r="1.5" className="fill-cyan-400 animate-ping" />
            <circle cx="30" cy="10" r="1" className="fill-cyan-400/30" />
            <circle cx="2" cy="22" r="1" className="fill-cyan-400/30" />

            {/* Code brackets (Dev) */}
            <path d="M7 11L4 16L7 21" className="stroke-cyan-500/25 stroke-[1.2]" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 11L28 16L25 21" className="stroke-cyan-500/25 stroke-[1.2]" strokeLinecap="round" strokeLinejoin="round" />

            {/* Navigation Fighter Jet (Pilot) */}
            <path 
              d="M16 8L23 20L16 17.5L9 20L16 8Z" 
              fill="url(#logoGrad)" 
              filter="url(#logoGlow)"
              className="transition-transform duration-300 hover:scale-105 origin-center" 
            />
            
            {/* Jet Center line */}
            <path d="M16 8V17.5" className="stroke-zinc-950 stroke-[1.2]" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="font-heading text-lg font-extrabold text-zinc-100 tracking-tight leading-none">DevPilot</h2>
          <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Advanced AI Assistant</span>
        </div>
      </div>
      
      <div className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase ml-12 mb-6">
        Multi-Agent · RAG · SSE
      </div>

      <hr className="border-zinc-800/80 mb-6" />

      {/* Navigation options */}
      <nav className="flex flex-col gap-1.5">
        <button
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left border ${
            activeMode === "ask"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/2"
              : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 hover:border-zinc-800"
          }`}
          onClick={() => setActiveMode("ask")}
        >
          <MessageSquare size={16} />
          <span>Ask (RAG)</span>
        </button>

        <button
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left border ${
            activeMode === "agent"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/2"
              : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 hover:border-zinc-800"
          }`}
          onClick={() => setActiveMode("agent")}
        >
          <Bot size={16} />
          <span>Agent Run</span>
        </button>

        <button
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left border ${
            activeMode === "repos"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/2"
              : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 hover:border-zinc-800"
          }`}
          onClick={() => setActiveMode("repos")}
        >
          <Database size={16} />
          <span>Manage Repos</span>
        </button>
      </nav>

      {/* API Details Box */}
      <div className="mt-auto">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono tracking-wider uppercase mb-2">
          <Server size={10} />
          API Endpoints
        </div>
        <div className="font-mono text-[10px] bg-zinc-950/80 border border-zinc-900 text-zinc-400 p-3 rounded-lg leading-relaxed space-y-1">
          <div><span className="text-emerald-500 font-semibold">POST</span> /ask/stream</div>
          <div><span className="text-emerald-500 font-semibold">POST</span> /agent/run/stream</div>
          <div><span className="text-emerald-500 font-semibold">POST</span> /upload-github</div>
          <div><span className="text-sky-500 font-semibold">GET</span>  /repos</div>
        </div>
      </div>
    </aside>
  );
};
