from crewai import Agent
from app.services.crewai_llm import CustomLLM
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response


def create_reviewer_agent():
    return Agent(
        role="Senior Code Reviewer",
        goal="Review code quality and architecture",
        backstory="Expert software architect and reviewer",
        llm=CustomLLM(model="openrouter/custom"),
        verbose=True,
    )


def run_reviewer(
    instruction: str,
    tools: list,
    previous_output: str
) -> AgentOutput:

    prompt = f"""
You are a Senior Code Reviewer.

Review the findings below.

Previous Findings:
{previous_output}

Task:
{instruction}

Focus on:
- Code quality
- Maintainability
- Scalability
- Best practices

Return a structured review.
"""

    output = get_llm_response(prompt)

    return AgentOutput(
        agent="reviewer",
        status="success",
        output=output,
        tools_used=[],
        next_agent="debugger"
    )