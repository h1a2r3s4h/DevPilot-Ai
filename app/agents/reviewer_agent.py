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

    prompt = f"""You are a Principal Software Architect and Senior Code Reviewer.

Evaluate the implementation below and provide an elite, structured code review.

Previous Agent Implementation:
{previous_output}

Review Objective:
{instruction}

Structure your review using these exact markdown sections:
### 🔍 Architectural & Design Quality
- Analysis of patterns, modularity, separation of concerns.

### ⚡ Performance & Efficiency
- Time/space complexity, resource bottlenecks, asynchronous optimization.

### 🛡️ Security & Robustness
- Input validation, vulnerability risks, error handling resilience.

### 💡 Concrete Recommendations
- Specific actionable refactoring improvements.
"""

    output = get_llm_response(prompt)

    return AgentOutput(
        agent="reviewer",
        status="success",
        output=output,
        tools_used=[],
        next_agent="debugger"
    )