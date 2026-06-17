from typing import List

from app.agents.planner_agent import plan_task
from app.agents.coder_agent import run_coder
from app.agents.reviewer_agent import run_reviewer
from app.agents.debugger_agent import run_debugger
from app.agents.executor_agent import run_executor
from app.agents.agent_output import AgentOutput


AGENT_MAP = {
    "coder": run_coder,
    "reviewer": run_reviewer,
    "debugger": run_debugger,
    "executor": run_executor,
    "code_executor": run_executor,
}


def run_multi_agent_system(user_query: str) -> dict:

    pass

    plan = plan_task(user_query)

    pass
    pass

    steps = plan.get("steps", [])

    results: List[AgentOutput] = []
    previous_output = ""

    for idx, step in enumerate(steps):

        agent_name = step.get("agent", "coder")
        tools = step.get("tools", [])
        instruction = step.get("instruction", user_query)

        pass
        pass
        pass
        pass
        pass
        pass

        agent_fn = AGENT_MAP.get(agent_name)

        if not agent_fn:
            pass
            continue

        try:

            if agent_name == "coder":
                result = agent_fn(
                    instruction,
                    tools
                )

            else:
                result = agent_fn(
                    instruction,
                    tools,
                    previous_output
                )

            previous_output = result.output

            results.append(result)

            pass

        except Exception as e:

            pass
            pass

            results.append(
                AgentOutput(
                    agent=agent_name,
                    status="error",
                    output=str(e),
                    tools_used=tools,
                    next_agent=None,
                )
            )

    return {
        "query": user_query,
        "steps_executed": len(results),
        "results": [r.model_dump() for r in results],
        "final_output": (
            results[-1].output
            if results
            else "No output generated"
        ),
    }