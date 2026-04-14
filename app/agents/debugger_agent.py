from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.tools.tool_registry import tool_registry
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response

def create_debugger_agent():
    return Agent(
        role="Expert Debugger",
        goal="Find and fix bugs in code",
        backstory="Specialist in diagnosing and resolving complex software bugs",
        llm=CustomLLM(model="openrouter/custom"),
        verbose=True,
    )

def run_debugger(instruction: str, tools: list, previous_output: str = "") -> AgentOutput:
    context = ""
    tools_used = []

    for tool_name in tools:
        tool = tool_registry.get(tool_name)
        if tool:
            result = tool.run(instruction)
            context += f"\n[{tool_name}]:\n{result}\n"
            tools_used.append(tool_name)

    prompt = f"""
You are an expert debugger.
Previous agent output:
{previous_output}

Context:
{context}

Task: {instruction}

Identify issues and provide fixed code with explanation.
"""
    output = get_llm_response(prompt)
    return AgentOutput(
        agent="debugger",
        status="success",
        output=output,
        tools_used=tools_used,
        next_agent=None
    )