from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.tools.tool_registry import tool_registry
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response

def create_coder_agent():
    return Agent(
        role="Senior Python Developer",
        goal="Write clean, production-ready code",
        backstory="Expert Python engineer specializing in FastAPI and AI systems",
        llm=CustomLLM(model="openrouter/custom"),
        verbose=True,
    )

def run_coder(instruction: str, tools: list) -> AgentOutput:
    context = ""
    tools_used = []

    for tool_name in tools:
        tool = tool_registry.get(tool_name)
        if tool:
            result = tool.run(instruction)
            context += f"\n[{tool_name}]:\n{result}\n"
            tools_used.append(tool_name)

    prompt = f"""
You are a senior Python developer.
Context from tools:
{context}

Task: {instruction}

Write clean, production-ready code with comments.
"""
    output = get_llm_response(prompt)
    return AgentOutput(
        agent="coder",
        status="success",
        output=output,
        tools_used=tools_used,
        next_agent="reviewer"
    )