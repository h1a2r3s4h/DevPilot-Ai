from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import retriever
from app.services.llm_provider import get_llm_response
from app.agents.orchestrator import run_multi_agent_system

router = APIRouter()

class MCPToolRequest(BaseModel):
    tool: str
    arguments: dict

@router.get("/mcp/tools")
def get_tools():
    return {
        "tools": [
            {
                "name": "search_codebase",
                "description": "Search indexed codebase"
            },
            {
                "name": "ask_devpilot",
                "description": "Ask DevPilot AI a question"
            },
            {
                "name": "run_agent",
                "description": "Run multi-agent task"
            }
        ]
    }

@router.post("/mcp/call")
def call_tool(request: MCPToolRequest):
    if request.tool == "search_codebase":
        results = retriever.retrieve(request.arguments.get("query", ""))
        text = "\n\n".join([
            f"[{r['metadata'].get('source')}]\n{r['text']}"
            for r in results
        ])
        return {"result": text or "No results found."}

    elif request.tool == "ask_devpilot":
        question = request.arguments.get("question", "")
        results = retriever.retrieve(question)
        context = "\n\n".join([r["text"] for r in results])
        prompt = f"Context:\n{context}\n\nQuestion: {question}"
        response = get_llm_response(prompt)
        return {"result": response}

    elif request.tool == "run_agent":
        result = run_multi_agent_system(request.arguments.get("task", ""))
        return {"result": result["final_output"]}

    return {"error": "Unknown tool"}