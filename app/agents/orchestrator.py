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

    print(f"\n🧠 Planning task: {user_query}")

    plan = plan_task(user_query)

    print("\n📋 Generated Plan:")
    print(plan)

    steps = plan.get("steps", [])

    results: List[AgentOutput] = []
    previous_output = ""

    for idx, step in enumerate(steps):

        agent_name = step.get("agent", "coder")
        tools = step.get("tools", [])
        instruction = step.get("instruction", user_query)

        print(f"\n{'=' * 60}")
        print(f"STEP {idx + 1}")
        print(f"AGENT: {agent_name}")
        print(f"TOOLS: {tools}")
        print(f"INSTRUCTION: {instruction}")
        print(f"{'=' * 60}")

        agent_fn = AGENT_MAP.get(agent_name)

        if not agent_fn:
            print(f"⚠️ Unknown agent: {agent_name}")
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

            print(f"✅ {agent_name} completed")

        except Exception as e:

            print(f"❌ {agent_name} failed")
            print(str(e))

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