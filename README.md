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
| 🔍 | **RAG Pipeline** | FAISS vector store + sentence-transformers for semantic code search |
| 🤖 | **Multi-Agent System** | Planner → Coder → Executor → Reviewer with dynamic routing |
| ⚙️ | **Real Code Execution** | Agents actually run Python code in sandboxed subprocesses |
| 🌊 | **Streaming Responses** | Token-by-token SSE streaming — just like ChatGPT |
| 🧩 | **Dual Memory** | Short-term (session) + Long-term (FAISS) memory systems |
| 📦 | **Multi-Repo Support** | Instantly switch between indexed codebases |
| 🐙 | **GitHub Cloning** | Paste any public GitHub URL → auto-clone → index |
| 🌳 | **Smart Chunking** | AST-based splitting at function/class boundaries |
| 🔌 | **MCP Server** | Model Context Protocol integration for Claude Desktop |
| 🛡️ | **Rate Limiting** | 10 req/min per IP via SlowAPI |
| 🎨 | **Dual UI** | Streamlit + React (Vite) dark premium interfaces |

---

## 🏗️ Architecture

```
                         ┌─────────────────────────┐
                         │       User Query         │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │     FastAPI Backend      │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │            Orchestrator             │
                    │   Planner → decides agents + tools  │
                    └──┬──────────┬──────────┬───────────┘
                       │          │          │
          ┌────────────▼─┐  ┌─────▼────┐  ┌─▼──────────┐  ┌───────────┐
          │   Planner    │  │  Coder   │  │  Executor  │  │ Reviewer  │
          │   Agent      │  │  Agent   │  │  Agent     │  │  Agent    │
          └──────────────┘  └──────────┘  └────────────┘  └───────────┘
                       │          │          │
                    ┌──▼──────────▼──────────▼──┐
                    │        Tool Registry       │
                    │  RAG │ Memory │ Code Exec  │
                    └──────────────┬────────────┘
                                   │
              ┌────────────────────┴──────────────────┐
              │                                       │
   ┌──────────▼──────────┐              ┌─────────────▼──────────┐
   │    FAISS (RAG)       │              │   FAISS (Memory)       │
   │    faiss_index       │              │   memory_index         │
   └─────────────────────┘              └────────────────────────┘
```

---

## 🔄 End-to-End Request Flows

### Ask (RAG) Mode

When a user asks a question about a codebase:

```
User Question
      ↓
FastAPI Endpoint
      ↓
Hybrid Retriever (BM25 + FAISS)
      ↓
Top Relevant Chunks
      ↓
Reranker
      ↓
Context Builder
      ↓
Gemini 2.0 Flash
      ↓
Streaming Response (SSE)
      ↓
Frontend
```

### Agent Mode

When a user submits a development task:

```
User Task
     ↓
Planner Agent  →  Creates Execution Plan
     ↓
Coder Agent
     ↓
Reviewer Agent
     ↓
Debugger Agent
     ↓
Executor Agent
     ↓
Final Response
```

Each agent receives structured outputs from previous agents and contributes its own specialized analysis.

---

## 🔍 Retrieval Architecture

DevPilot AI uses **Hybrid Retrieval** rather than relying solely on vector similarity.

### BM25 Retrieval

Excels at **exact keyword matches** — API names, function names, class names, variable names.

```
Query: "create_user()"
→ BM25 directly matches exact occurrences
```

### Vector Retrieval

Excels at **semantic understanding** — similar code patterns, natural language queries.

```
Query: "How is authentication implemented?"
→ Vector search finds generate_jwt_token() even without exact keyword match
```

### Hybrid Search Pipeline

```
Query
 ↓
BM25 Search ──┐
              ├── Merge Results → Rerank → Final Context
FAISS Search ─┘
```

This significantly improves retrieval quality compared to pure vector search.

---

## 🤖 Agent Responsibilities

### Planner Agent

| | |
|---|---|
| **Responsibilities** | Understand user intent, select agents & tools, create execution plan |
| **Output** | Structured JSON execution plan |

```json
{
  "steps": [
    { "agent": "coder",    "tools": ["rag_search"] },
    { "agent": "reviewer"                           },
    { "agent": "executor"                           }
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
| **Responsibilities** | Code quality, architecture review, best practice analysis, maintainability assessment |
| **Output** | Strengths, weaknesses, refactoring suggestions |

### Debugger Agent

| | |
|---|---|
| **Responsibilities** | Bug detection, security analysis, edge case discovery, performance analysis |
| **Output** | Potential issues, security concerns, optimization opportunities |

### Executor Agent

| | |
|---|---|
| **Responsibilities** | Aggregate all findings, produce final response, generate implementation plan |
| **Output** | Final recommendation, summary, actionable next steps |

---

## 📦 Repository Indexing Pipeline

```
Repository
    ↓
Directory Walker
    ↓
File Filter
    ↓
Chunking Engine
    ↓
Embedding Model (all-MiniLM-L6-v2)
    ↓
FAISS Index
```

### Python Files — AST-Based Chunking

Instead of arbitrary line splits, the system extracts **semantic units**:

```
❌ Naive:   Lines 1–50 | Lines 51–100   (may cut mid-function)
✅ DevPilot: class UserService | def create_user()   (complete logical units)
```

**Benefits:** better retrieval precision · better context quality · lower token usage

### Other Files — Line-Based Chunking

JavaScript, TypeScript, React, Markdown, JSON, YAML → **50 lines per chunk** for predictable sizes and efficient indexing.

---

## 🧠 Memory Architecture

| Type | Storage | Scope | Purpose |
|---|---|---|---|
| **Short-Term** | In-memory `MemoryItem` list | Current session | Conversation continuity |
| **Long-Term** | FAISS `memory_index` | Persists across sessions | Recall previous discussions |

Both memory types are injected into every LLM prompt for full context continuity.

---

## 🌊 Streaming Architecture

```
LLM Token Stream
      ↓
FastAPI StreamingResponse
      ↓
Browser Event Stream (SSE)
      ↓
Real-Time UI Updates
```

**Benefits:** faster perceived latency · better UX · ChatGPT-like interaction model

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI + Uvicorn | High-performance async API server |
| **LLM** | Gemini 2.0 Flash via OpenRouter | Language model backbone |
| **Embeddings** | `sentence-transformers` (all-MiniLM-L6-v2) | Semantic code understanding |
| **Vector Store** | FAISS (custom, no LangChain) | Blazing fast similarity search |
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
│   │   ├── retriever.py            # Hybrid BM25 + FAISS retriever
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
│   │   ├── agent_service.py        # ask_llm with memory injection
│   │   ├── rag_service.py          # RAG service
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

Edit `.env` and add your API key:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

> 🔑 Get your API key at [openrouter.ai](https://openrouter.ai)

### 5. Launch the backend

```bash
uvicorn app.main:app --reload
```

### 6. Start the UI

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

Add the following to your Claude Desktop config at
`~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## 📊 How It Works

### 🔍 RAG Pipeline

```
1. Walk & read all code files in the repo
2. Python files → AST-based chunking (function/class boundaries)
3. Other files → line-based chunking (50 lines/chunk)
4. Each chunk embedded with all-MiniLM-L6-v2
5. Vectors stored in FAISS with metadata
6. At query time → hybrid BM25 + FAISS retrieval
7. Reranker selects top-k chunks
8. Context assembled and passed to Gemini 2.0 Flash
```

### 🤖 Multi-Agent Flow

```
1. User sends a task
2. Planner LLM creates a dynamic routing plan (JSON)
3. Each step runs the appropriate agent with specified tools
4. Agents access Tool Registry: RAG Search | Memory | Code Executor
5. Structured AgentOutput is passed between agents
6. Final output streamed back via SSE
```

### 🧠 Memory System

| Type | Storage | Scope |
|---|---|---|
| **Short-term** | In-memory list of `MemoryItem` objects | Current session only |
| **Long-term** | FAISS index (`memory_index`) | Persists across sessions |

Both memory types are injected into every LLM prompt for full context continuity.

---

## 📈 Scalability Considerations

**Current architecture** is designed for single-developer use and local deployment.

**Future scaling path:**

| Component | Current | Scaled Solution |
|---|---|---|
| Metadata storage | In-memory / file | PostgreSQL |
| Vector database | FAISS (local) | Qdrant (distributed) |
| Caching | None | Redis |
| Background tasks | Synchronous | Celery workers |
| Deployment | Local / Docker | Kubernetes |
| Auth | None | Multi-user authentication |

---

## 📋 Requirements

```
fastapi              uvicorn              sentence-transformers
faiss-cpu            openai               python-dotenv
pydantic-settings    crewai               gitpython
slowapi              mcp                  anthropic
streamlit            requests
```

---

## 🎯 Key Engineering Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Retrieval-Augmented Generation** | FAISS + sentence-transformers for semantic code retrieval |
| **Hybrid Search** | BM25 keyword search + vector similarity, merged and reranked |
| **Multi-Agent AI Systems** | CrewAI-based Planner, Coder, Reviewer, Debugger, Executor agents |
| **Agent Orchestration** | Dynamic JSON execution plans with per-step tool selection |
| **Vector Databases** | Custom FAISS implementation — no LangChain dependency |
| **Memory Architectures** | Dual short-term (session) and long-term (FAISS) memory layers |
| **Server-Sent Events** | Real-time token-by-token streaming for all LLM responses |
| **Model Context Protocol** | Full MCP server integration for Claude Desktop, Cursor, VS Code |
| **Repository Intelligence** | AST-based Python chunking + line-based for other languages |
| **FastAPI Production Design** | Async endpoints, rate limiting, structured agent outputs |

---

## 🧑‍💻 Built By

**Harshit Gangwar** — [github.com/harshitgangwar](https://github.com/harshitgangwar)

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

*If this project helped you, drop a ⭐ — it means a lot!*

</div>