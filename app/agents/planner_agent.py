from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.tools.tool_registry import tool_registry
from app.services.llm_provider import get_llm_response
import json


def create_planner_agent():
    return Agent(
        role="Senior Software Architect",
        goal="Break down user requests into execution plans",
        backstory="Expert in planning software tasks and routing work between agents",
        llm=CustomLLM(model="openrouter/custom"),
        verbose=True,
    )


def plan_task(user_query: str) -> dict:

    tools_desc = tool_registry.describe()

    prompt = f"""
You are a Senior Software Architect.

Your job is to create a multi-agent execution plan.

Available tools:
{tools_desc}

Available agents:
- coder: finds code, explains implementation, writes code
- reviewer: reviews code quality and architecture
- debugger: finds bugs, security issues, edge cases
- executor: generates the final answer

Routing Rules:

1. If user wants explanation:
   coder -> executor

2. If user wants bug analysis:
   coder -> debugger -> executor

3. If user wants code review:
   coder -> reviewer -> executor

4. If user wants refactoring:
   coder -> reviewer -> debugger -> executor

5. For repository questions:
   always use rag_search

6. Every plan MUST end with executor

User Request:
"{user_query}"

Return ONLY valid JSON.

Example:

{{
  "steps": [
    {{
      "agent": "coder",
      "tools": ["rag_search"],
      "instruction": "Analyze repository and gather relevant information"
    }},
    {{
      "agent": "executor",
      "tools": [],
      "instruction": "Generate final answer"
    }}
  ]
}}
"""

    raw = get_llm_response(prompt)

    try:
        clean = (
            raw.strip()
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        plan = json.loads(clean)

        if not plan.get("steps"):
            raise Exception("No steps found")

        return plan

    except Exception as e:

        print("Planner Error:", e)
        print("Raw Output:", raw)

        return {
            "steps": [
                {
                    "agent": "coder",
                    "tools": ["rag_search"],
                    "instruction": user_query,
                },
                {
                    "agent": "executor",
                    "tools": [],
                    "instruction": "Generate final answer",
                },
            ]
        }