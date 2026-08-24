from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.tools.tool_registry import tool_registry
from app.services.llm_provider import client
import json
import instructor
from pydantic import BaseModel, Field
from typing import List, Literal

class PlanStep(BaseModel):
    agent: Literal["coder", "reviewer", "debugger", "executor"] = Field(
        ..., 
        description="The agent assigned to this step: 'coder', 'reviewer', 'debugger', or 'executor'."
    )
    tools: List[Literal["rag_search", "code_executor", "terminal_command"]] = Field(
        default_factory=list,
        description="The tools available for this step. Options: 'rag_search', 'code_executor', 'terminal_command'."
    )
    instruction: str = Field(
        ...,
        description="Specific clear instruction for this agent to follow."
    )

class ExecutionPlan(BaseModel):
    steps: List[PlanStep] = Field(
        ..., 
        description="The sequence of execution steps to accomplish the task."
    )

# Wrap the client with instructor for structured output enforcement
instructor_client = instructor.from_openai(client)

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
"""

    try:
        # Enforce structured output matching ExecutionPlan schema via OpenRouter
        plan: ExecutionPlan = instructor_client.chat.completions.create(
            model="openrouter/free",
            response_model=ExecutionPlan,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_retries=2
        )
        return plan.model_dump()
    except Exception as e:
        print(f"\n[Planner Error] Instructor parsing failed, using fallback plan: {e}\n")
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