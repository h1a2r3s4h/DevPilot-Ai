<div align="center">

```
██████╗ ███████╗██╗   ██╗██████╗ ██╗██╗      ██████╗ ████████╗
██╔══██╗██╔════╝██║   ██║██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
██║  ██║█████╗  ██║   ██║██████╔╝██║██║     ██║   ██║   ██║
██║  ██║██╔══╝  ╚██╗ ██╔╝██╔═══╝ ██║██║     ██║   ██║   ██║
██████╔╝███████╗ ╚████╔╝ ██║     ██║███████╗╚██████╔╝   ██║
╚═════╝ ╚══════╝  ╚═══╝  ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝
                                                    A I  ⚡
```

**A production-grade, multi-agent AI developer assistant that understands your codebase,**
**executes code autonomously, and answers with context-aware precision.**

---

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_Store-blueviolet?style=for-the-badge)](https://github.com/facebookresearch/faiss)
[![CrewAI](https://img.shields.io/badge/CrewAI-Multi_Agent-orange?style=for-the-badge)](https://crewai.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🧠 What is DevPilot AI?

DevPilot AI is not just another chatbot wrapper. It's a **fully autonomous developer assistant** powered by a pipeline of specialized agents — each with its own role, tools, and memory — working together to understand, write, execute, and review code across your entire codebase.

> Think of it as having a senior dev, a code reviewer, and a QA engineer all available 24/7, all knowing your codebase inside-out.

---

## ✨ Features at a Glance

| | Feature | Description |
|---|---|---|
| 🔍 | **Hybrid RAG Pipeline** | BM25 + FAISS + Cross-Encoder reranking for precision retrieval |
| 🤖 | **Multi-Agent System** | Planner → Coder → Reviewer → Debugger → Executor with dynamic routing |
| ⚙️ | **Real Code Execution** | Agents run Python code in sandboxed subprocesses |
| 🌊 | **Streaming Responses** | Token-by-token SSE streaming — just like ChatGPT |
| 🧩 | **Dual Memory** | Short-term (session) + Long-term (FAISS) memory systems |
| ⚡ | **Redis Caching** | Query response + embedding vector caching for reduced latency and LLM cost |
| 📦 | **Multi-Repo Support** | Instantly switch between indexed codebases |
| 🐙 | **GitHub Cloning** | Paste any public GitHub URL → auto-clone → index |
| 🌳 | **Smart Chunking** | AST-based splitting at function/class boundaries |
| 🔌 | **MCP Server** | Model Context Protocol integration for Claude Desktop & VS Code |
| 🛡️ | **Rate Limiting** | 10 req/min per IP via SlowAPI |
| 🎨 | **Dual UI** | Streamlit + React (Vite) dark premium interfaces |

---

## 🏗️ System Architecture

```
                              React UI
                                 │
                           FastAPI API
                    ┌────────────┼────────────┐
                    │            │             │
               RAG Engine   Agent System   MCP Server
                    │            │
              BM25 + FAISS   CrewAI Agents
                    │            │
              Redis Cache    Tool Registry
                    └────────────┘
                           │
                       OpenRouter
                           │
                      Gemini Flash
```

---

## 🔄 End-to-End Request Flows

### Ask (RAG) Mode

```
User Question
      ↓
FastAPI Endpoint
      ↓
Redis Cache → Cache Hit? ──Yes──▶ Return Cached Answer
      │ No
      ▼
Hybrid Retriever (BM25 + FAISS)
      ↓
Merge Results
      ↓
Cross-Encoder Reranker
      ↓
Top-K Context
      ↓
Gemini 2.0 Flash (via OpenRouter)
      ↓
Store in Redis
      ↓
Streaming Response (SSE) → React UI
```

### Agent Mode

```
User Task
     ↓
Planner Agent  →  Creates JSON Execution Plan
     ↓
┌────┬────────┬──────────┬──────────┐
│    │        │          │          │
Coder  Reviewer  Debugger  Executor
     ↓
Structured Outputs  (previous_output = result.output)
     ↓
Final Response (streamed via SSE)
```

> Each agent receives the previous agent's structured output as context — no information is lost between steps.

---

## 🔍 Hybrid Retrieval Architecture

DevPilot AI uses a **3-stage retrieval pipeline** for maximum precision.

### Stage 1 — BM25 (Keyword Search)
Exact matches for API names, function names, class names, variable identifiers.
```
Query: "create_user()"  →  BM25 directly matches exact occurrences
```

### Stage 2 — FAISS (Vector Search)
Semantic understanding for natural language and conceptually related code.
```
Query: "How is authentication implemented?"
→ Finds generate_jwt_token() via semantic similarity
```

### Stage 3 — Cross-Encoder Reranker
Both result sets are merged and a cross-encoder model performs final reranking for the highest-quality top-K context passed to the LLM.

| Component | Purpose |
|---|---|
| BM25 | Exact keyword matching |
| FAISS | Semantic similarity |
| Cross Encoder | Final reranking |
| LLM | Answer generation |

---

## ⚡ Redis Caching Layer

```
User Query
     ↓
Redis Cache
     ↓
Cache Hit? ──Yes──▶ Return Cached Answer (instant)
     │ No
     ▼
BM25 + FAISS Retrieval → LLM → Store in Redis
```

### What gets cached

| Cached Component | Benefit |
|---|---|
| RAG query responses | Instant repeat answers |
| Repository summaries | Skip re-summarisation |
| Embedding vectors | Avoid redundant model calls |
| Agent outputs | Reuse for identical tasks |
| Session history | Fast context restoration |

**Benefits:** Reduced LLM cost · Lower latency · Faster repeated queries · Improved scalability

---

## 🤖 Agent Responsibilities

### Planner Agent
Understands user intent, selects agents and tools, and outputs a structured JSON execution plan.

```json
{
  "steps": [
    { "agent": "coder",    "tools": ["rag_search", "memory"] },
    { "agent": "reviewer"                                     },
    { "agent": "debugger"                                     },
    { "agent": "executor"                                     }
  ]
}
```

### Coder Agent
| | |
|---|---|
| **Responsibilities** | Analyze repo context, explain implementation, generate code, understand architecture |
| **Tools** | RAG Search, Memory |
| **Output** | Implementation findings, relevant files, code flow explanation |

### Reviewer Agent
| | |
|---|---|
| **Responsibilities** | Code quality, architecture review, best practice & maintainability analysis |
| **Output** | Strengths, weaknesses, refactoring suggestions |

### Debugger Agent
| | |
|---|---|
| **Responsibilities** | Bug detection, security analysis, edge case discovery, performance analysis |
| **Output** | Potential issues, security concerns, optimization opportunities |

### Executor Agent
| | |
|---|---|
| **Responsibilities** | Aggregate all agent findings, produce final response, generate implementation plan |
| **Output** | Final recommendation, summary, actionable next steps |

---

## 📦 Code Indexing Pipeline

```
Repository
     ↓
File Walker
     ↓
Extension Filter
     ↓
AST Chunking (Python) / Line-based (others)
     ↓
Metadata Injection
     ↓
Embeddings (all-MiniLM-L6-v2)
     ↓
FAISS Storage
```

### Metadata stored per chunk
```json
{
  "source": "auth.py",
  "path": "/app/services/auth.py",
  "extension": ".py"
}
```

### Python Files — AST-Based Chunking

Instead of arbitrary line splits, the system extracts **semantic units**:

```
❌ Naive:    Lines 1–50 | Lines 51–100      (may cut mid-function)
✅ DevPilot: class UserService | def create_user()  (complete logical units)
```

**Benefits:** better retrieval precision · richer LLM context · lower token usage

### Other Files — Line-Based Chunking
JavaScript, TypeScript, React, Markdown, JSON, YAML → **50 lines per chunk.**

---

## 🌊 Streaming Architecture

```
User
  ↓
FastAPI
  ↓
OpenRouter
  ↓
Gemini 2.0 Flash
  ↓
Token Stream
  ↓
Server-Sent Events (SSE)
  ↓
React UI  (real-time token-by-token updates)
```

**Advantages:** Real-time responses · Lower perceived latency · ChatGPT-like experience · Efficient transport layer

---

## 🧠 Memory Architecture

| Type | Storage | Scope | Purpose |
|---|---|---|---|
| **Short-Term** | In-memory `MemoryItem` list | Current session | Conversation continuity |
| **Long-Term** | FAISS `memory_index` | Persists across sessions | Recall previous discussions |

Both memory types are injected into every LLM prompt for full context continuity.

---

## 🎯 Engineering Challenges Solved

| Challenge | Solution |
|---|---|
| Large repositories exceed LLM context limits | AST-based chunking + FAISS retrieval — only relevant chunks are sent |
| Keyword search misses semantic meaning | BM25 + Vector Search Hybrid Retrieval |
| Repeated queries increase latency and cost | Redis response caching |
| Complex development tasks require specialization | Multi-agent architecture with dynamic planning |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Uvicorn | High-performance async API server |
| **LLM** | Gemini 2.0 Flash via OpenRouter | Language model backbone |
| **Embeddings** | `sentence-transformers` (all-MiniLM-L6-v2) | Semantic code understanding |
| **Vector Store** | FAISS (custom, no LangChain) | Blazing fast similarity search |
| **Reranking** | Cross-Encoder | Final result reranking for precision |
| **Caching** | Redis | Query + embedding vector caching |
| **Agents** | CrewAI + custom LLM wrapper | Multi-agent orchestration |
| **Memory** | Short-term (session) + Long-term (FAISS) | Persistent context awareness |
| **Streaming** | Server-Sent Events (SSE) | Real-time response delivery |
| **Rate Limiting** | SlowAPI | Abuse prevention |
| **MCP** | Anthropic MCP SDK | IDE/editor integration protocol |
| **UI** | Streamlit + React (Vite) | Dual frontend options |
| **Git** | GitPython | Auto-clone & repo management |

---

## 📁 Project Structure

```
devpilot-ai/
│
├── 📂 app/
│   ├── 🤖 agents/
│   │   ├── orchestrator.py         # Dynamic task router
│   │   ├── planner_agent.py        # Plans steps + tools → JSON execution plan
│   │   ├── coder_agent.py          # Writes & explains code
│   │   ├── executor_agent.py       # Runs code in sandboxed subprocess
│   │   ├── debugger_agent.py       # Bug detection & security analysis
│   │   ├── reviewer_agent.py       # Code quality & architecture review
│   │   ├── agent_output.py         # Structured output schema
│   │   └── tasks.py
│   │
│   ├── 🧠 memory/
│   │   ├── short_term_memory.py    # Session-based memory
│   │   ├── long_term_memory.py     # FAISS-based persistent memory
│   │   ├── memory_service.py       # Memory orchestrator
│   │   └── memory_schema.py
│   │
│   ├── 🔍 rag/
│   │   ├── embedder.py             # sentence-transformers encoder
│   │   ├── retriever.py            # Hybrid BM25 + FAISS + Cross-Encoder retriever
│   │   └── vector_store.py         # FAISS vector store
│   │
│   ├── 🌐 routes/
│   │   ├── ask.py                  # /ask endpoint (blocking)
│   │   ├── stream.py               # /ask/stream SSE
│   │   ├── upload.py               # File upload
│   │   ├── upload_repo.py          # Repo indexing + GitHub cloning
│   │   ├── agent_run.py            # /agent/run + streaming
│   │   └── mcp_route.py            # MCP HTTP endpoints
│   │
│   ├── ⚙️ services/
│   │   ├── llm_provider.py         # OpenRouter LLM client
│   │   ├── agent_service.py        # ask_llm with memory + Redis injection
│   │   ├── rag_service.py          # RAG service
│   │   ├── cache_service.py        # Redis caching layer
│   │   └── crewai_llm.py           # Custom CrewAI LLM wrapper
│   │
│   ├── 🔧 tools/
│   │   ├── base_tool.py            # Tool interface
│   │   ├── rag_search_tool.py      # RAG search tool
│   │   ├── memory_tool.py          # Memory search tool
│   │   ├── code_execution_tool.py  # Python executor
│   │   └── tool_registry.py        # Tool registry
│   │
│   ├── 🔌 mcp/
│   │   └── server.py               # MCP server
│   │
│   ├── ⚙️ config/
│   │   └── settings.py             # Pydantic settings
│   │
│   └── main.py                     # FastAPI app entry point
│
├── 🎨 ui/
│   ├── app.py                      # Streamlit UI
│   └── react-app/                  # React UI (Vite)
│
├── 🧪 tests/
│   └── test_agents.py
│
├── .env                            # Environment variables
├── Dockerfile                      # Container config
├── requirements.txt                # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/harshitgangwar/devpilot-ai
cd devpilot-ai
```

### 2. Set up a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
REDIS_URL=redis://localhost:6379
```

> 🔑 Get your OpenRouter API key at [openrouter.ai](https://openrouter.ai)

### 5. Start Redis (optional but recommended)

```bash
docker run -d -p 6379:6379 redis:alpine
```

### 6. Launch the backend

```bash
uvicorn app.main:app --reload
```

### 7. Start the UI

```bash
# Option A — Streamlit (simpler)
streamlit run ui/app.py

# Option B — React (production-grade)
cd ui/react-app && npm install && npm run dev
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload-repo` | Index a local repository |
| `POST` | `/upload-github` | Clone & index a GitHub repo |
| `POST` | `/repos/switch` | Switch the active repo |
| `GET` | `/repos` | List all indexed repos |
| `POST` | `/ask` | Ask a question (blocking) |
| `POST` | `/ask/stream` | Ask a question (streaming SSE) |
| `POST` | `/agent/run` | Run a multi-agent task |
| `POST` | `/agent/run/stream` | Run agents with streaming SSE |
| `GET` | `/mcp/tools` | List available MCP tools |
| `POST` | `/mcp/call` | Call a specific MCP tool |

---

## 🔗 MCP Integration

DevPilot AI ships with a fully compatible MCP server for **Claude Desktop**, **Cursor**, and **VS Code**.

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devpilot-ai": {
      "command": "/path/to/venv/bin/python",
      "args": ["-m", "app.mcp.server"],
      "cwd": "/path/to/devpilot-ai",
      "env": {
        "PYTHONPATH": "/path/to/devpilot-ai"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `search_codebase` | Semantic search over your indexed repository |
| `ask_devpilot` | Ask questions with full RAG context |
| `run_agent` | Trigger the full multi-agent task pipeline |

---

## 📈 Scalability Roadmap

**Current architecture** is optimised for single-developer use and local deployment.

### Planned Enhancements

| Enhancement | Purpose |
|---|---|
| Redis distributed caching | Multi-node cache for scaled deployments |
| Background indexing jobs | Non-blocking repo ingestion |
| Celery task queue | Async agent execution |
| PostgreSQL metadata store | Structured, queryable chunk metadata |
| Multi-user authentication | Team and enterprise support |
| Repository versioning | Track codebase changes over time |
| Cross-encoder reranking (upgrade) | Higher-precision retrieval |
| Graph-based code retrieval | Dependency-aware search |
| LangGraph workflow support | More complex agent topologies |
| Kubernetes deployment | Production-scale orchestration |

---

## 📋 Requirements

```
fastapi              uvicorn              sentence-transformers
faiss-cpu            openai               python-dotenv
pydantic-settings    crewai               gitpython
slowapi              mcp                  anthropic
streamlit            requests             redis
```

---

## 🎯 Key Engineering Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Retrieval-Augmented Generation** | FAISS + sentence-transformers for semantic code retrieval |
| **Hybrid Search** | BM25 + FAISS merged and reranked by Cross-Encoder |
| **Multi-Agent AI Systems** | CrewAI-based Planner, Coder, Reviewer, Debugger, Executor |
| **Agent Orchestration** | Dynamic JSON execution plans with per-step tool selection |
| **Vector Databases** | Custom FAISS — no LangChain dependency |
| **Cross-Encoder Reranking** | Second-pass precision ranking over merged retrieval results |
| **Redis Caching** | Query responses, embeddings, and agent outputs cached for speed |
| **Memory Architectures** | Dual short-term (session) and long-term (FAISS) memory |
| **Server-Sent Events** | Real-time token streaming across the full agent pipeline |
| **Model Context Protocol** | Full MCP server for Claude Desktop, Cursor, VS Code |
| **AST-based Code Chunking** | Semantic Python splitting at function/class boundaries |
| **FastAPI Production Design** | Async endpoints, rate limiting, structured agent outputs |

---

## 🧑‍💻 Built By

**Harshit Gangwar** — [github.com/harshitgangwar](https://github.com/harshitgangwar)

---

## 📄 License

Licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

*If this project helped you, drop a ⭐ — it means a lot!*

</div>