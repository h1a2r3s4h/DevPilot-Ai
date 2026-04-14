# 🚀 DevPilot AI

> A production-grade, multi-agent AI developer assistant that understands your codebase, executes code autonomously, and answers questions with context-aware precision.

---

## ✨ Features

- **RAG Pipeline** — FAISS vector store + sentence-transformers for semantic code search
- **Multi-Agent System** — Planner → Coder → Executor → Reviewer with dynamic task routing
- **Real Code Execution** — Agents actually run Python code in a sandboxed subprocess
- **Streaming Responses** — Token-by-token SSE streaming like ChatGPT
- **Short + Long Term Memory** — Separate FAISS indexes for session and persistent memory
- **Multi-Repo Support** — Switch between indexed codebases instantly
- **GitHub Cloning** — Paste any public GitHub URL → auto-clone → index
- **Smart Chunking** — AST-based chunking splits code at function/class boundaries
- **MCP Server** — Model Context Protocol integration for Claude Desktop
- **Rate Limiting** — 10 requests/minute per IP via SlowAPI
- **Streamlit UI** — Dark premium chat interface with streaming support
- **React UI** — Production-grade dark terminal aesthetic frontend

---

## 🏗️ Architecture

```
User Query
    ↓
FastAPI Backend
    ↓
┌─────────────────────────────────────┐
│         Orchestrator                │
│  Planner → decides agents + tools   │
└─────────────────────────────────────┘
    ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Planner │  │  Coder   │  │ Executor │  │ Reviewer │
│  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
    ↓
┌─────────────────────────────────────┐
│           Tool Registry             │
│  RAG Search | Memory | Code Exec    │
└─────────────────────────────────────┘
    ↓
┌──────────────────┐  ┌──────────────────┐
│   FAISS (RAG)    │  │  FAISS (Memory)  │
│  faiss_index     │  │  memory_index    │
└──────────────────┘  └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| LLM | Gemini 2.0 Flash via OpenRouter |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Vector Store | FAISS (custom, no LangChain) |
| Agents | CrewAI with custom LLM wrapper |
| Memory | Short-term (session) + Long-term (FAISS) |
| Streaming | Server-Sent Events (SSE) |
| Rate Limiting | SlowAPI |
| MCP | Anthropic MCP SDK |
| UI | Streamlit + React (Vite) |
| Git Integration | GitPython |

---

## 📁 Project Structure

```
devpilot-ai/
├── app/
│   ├── agents/
│   │   ├── orchestrator.py      # Dynamic task router
│   │   ├── planner_agent.py     # Plans steps + tools
│   │   ├── coder_agent.py       # Writes code
│   │   ├── executor_agent.py    # Runs code
│   │   ├── debugger_agent.py    # Fixes bugs
│   │   ├── reviewer_agent.py    # Reviews output
│   │   ├── agent_output.py      # Structured output schema
│   │   └── tasks.py
│   ├── memory/
│   │   ├── short_term_memory.py # Session-based memory
│   │   ├── long_term_memory.py  # FAISS-based memory
│   │   ├── memory_service.py    # Memory orchestrator
│   │   └── memory_schema.py
│   ├── rag/
│   │   ├── embedder.py          # sentence-transformers
│   │   ├── retriever.py         # RAG retriever
│   │   └── vector_store.py      # FAISS vector store
│   ├── routes/
│   │   ├── ask.py               # /ask endpoint
│   │   ├── stream.py            # /ask/stream SSE
│   │   ├── upload.py            # File upload
│   │   ├── upload_repo.py       # Repo indexing + GitHub
│   │   ├── agent_run.py         # /agent/run + streaming
│   │   └── mcp_route.py         # MCP HTTP endpoints
│   ├── services/
│   │   ├── llm_provider.py      # OpenRouter LLM client
│   │   ├── agent_service.py     # ask_llm with memory
│   │   ├── rag_service.py       # RAG service
│   │   └── crewai_llm.py        # Custom CrewAI LLM
│   ├── tools/
│   │   ├── base_tool.py         # Tool interface
│   │   ├── rag_search_tool.py   # RAG search tool
│   │   ├── memory_tool.py       # Memory search tool
│   │   ├── code_execution_tool.py # Python executor
│   │   └── tool_registry.py     # Tool registry
│   ├── mcp/
│   │   └── server.py            # MCP server
│   ├── config/
│   │   └── settings.py          # Pydantic settings
│   └── main.py                  # FastAPI app
├── ui/
│   ├── app.py                   # Streamlit UI
│   └── react-app/               # React UI (Vite)
├── tests/
│   └── test_agents.py
├── .env
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/devpilot-ai
cd devpilot-ai
```

### 2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 5. Start the backend
```bash
uvicorn app.main:app --reload
```

### 6. Start the UI
```bash
# Streamlit
streamlit run ui/app.py

# OR React
cd ui/react-app && npm install && npm run dev
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload-repo` | Index a local repository |
| POST | `/upload-github` | Clone & index a GitHub repo |
| POST | `/repos/switch` | Switch active repo |
| GET | `/repos` | List all indexed repos |
| POST | `/ask` | Ask a question (blocking) |
| POST | `/ask/stream` | Ask a question (streaming SSE) |
| POST | `/agent/run` | Run multi-agent task |
| POST | `/agent/run/stream` | Run agents (streaming SSE) |
| GET | `/mcp/tools` | List MCP tools |
| POST | `/mcp/call` | Call an MCP tool |

---

## 🤖 MCP Integration

DevPilot AI exposes an MCP server compatible with Claude Desktop, Cursor, and VS Code.

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

Available MCP tools:
- `search_codebase` — Semantic search over indexed repo
- `ask_devpilot` — Ask questions with RAG context
- `run_agent` — Trigger multi-agent task execution

---

## 📋 Requirements

```
fastapi
uvicorn
sentence-transformers
faiss-cpu
openai
python-dotenv
pydantic-settings
crewai
gitpython
slowapi
mcp
anthropic
streamlit
requests
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |

Get your API key at [openrouter.ai](https://openrouter.ai)

---

## 📊 How It Works

### RAG Pipeline
1. Code files are walked and read
2. Python files chunked by AST (function/class boundaries)
3. Other files chunked by lines (50 lines each)
4. Each chunk embedded with `all-MiniLM-L6-v2`
5. Vectors stored in FAISS with metadata
6. At query time, top-k chunks retrieved by cosine similarity

### Multi-Agent Flow
1. User sends a task
2. Planner LLM creates a dynamic routing plan (JSON)
3. Each step runs the appropriate agent with specified tools
4. Agents use Tool Registry (RAG, Memory, Code Executor)
5. Structured `AgentOutput` passed between agents
6. Final output streamed back via SSE

### Memory System
- **Short-term**: Session-based list of `MemoryItem` objects
- **Long-term**: FAISS index (`memory_index`) storing past interactions
- Both injected into every LLM prompt for context

---

## 🧠 Built By

Harshit Gangwar — [GitHub](https://github.com/harshitgangwar)

---

## 📄 License

MIT License
