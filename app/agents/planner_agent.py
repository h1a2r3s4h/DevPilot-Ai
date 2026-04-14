from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.tools.tool_registry import tool_registry
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response
import json

def create_planner_agent():
    return Agent(
        role="Senior Software Architect",
        goal="Break down user requests into steps and decide which agents and tools to use",
        backstory="Expert in planning scalable systems and routing tasks intelligently",
        llm=CustomLLM(model="openrouter/custom"),
        verbose=True,
    )

def plan_task(user_query: str) -> dict:
    """
    Dynamically decide: which agents to invoke + which tools to use.
    Returns a routing plan.
    """
    tools_desc = tool_registry.describe()
    prompt = f"""
You are a task planner for an AI developer assistant.

Available tools:
{tools_desc}

Available agents:
- coder: writes or explains code
- debugger: finds and fixes bugs
- reviewer: reviews code quality

User request: "{user_query}"

Respond ONLY with valid JSON like this:
{{
  "steps": [
    {{"agent": "coder", "tools": ["rag_search"], "instruction": "Write a FastAPI endpoint"}},
    {{"agent": "reviewer", "tools": [], "instruction": "Review the generated code"}}
  ]
}}
"""
    raw = get_llm_response(prompt)
    try:
        # strip markdown fences if present
        clean = raw.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        # fallback plan
        return {
            "steps": [
                {"agent": "coder", "tools": ["rag_search"], "instruction": user_query}
            ]
        }