import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from app.services.llm_provider import get_llm_response
from app.agents.orchestrator import run_multi_agent_system

app = Server("devpilot-ai")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="search_codebase",
            description="Search the indexed codebase for relevant code or documentation",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="ask_devpilot",
            description="Ask DevPilot AI a question about your codebase",
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "Question to ask"}
                },
                "required": ["question"]
            }
        ),
        Tool(
            name="run_agent",
            description="Run multi-agent system to plan, write and execute code",
            inputSchema={
                "type": "object",
                "properties": {
                    "task": {"type": "string", "description": "Task for agents to execute"}
                },
                "required": ["task"]
            }
        ),
        Tool(
            name="web_search",
            description="Search the live web for external Python, framework, or library documentation",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "search_codebase":
        from app.services.rag_service import query_rag
        text = query_rag(arguments.get("query", ""))
        return [TextContent(type="text", text=text or "No results found.")]

    elif name == "ask_devpilot":
        response = get_llm_response(arguments.get("question", ""))
        return [TextContent(type="text", text=response or "Failed to generate LLM response.")]

    elif name == "run_agent":
        result = run_multi_agent_system(arguments.get("task", ""))
        return [TextContent(type="text", text=result.get("final_output", "No output from agents."))]

    elif name == "web_search":
        from app.tools.web_search_tool import WebSearchTool
        output = WebSearchTool().run(arguments.get("query", ""))
        return [TextContent(type="text", text=output)]

    return [TextContent(type="text", text="Unknown tool")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())