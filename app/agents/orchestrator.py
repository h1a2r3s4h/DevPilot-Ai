from app.agents.planner_agent import plan_task
from app.agents.coder_agent import run_coder
from app.agents.debugger_agent import run_debugger
from app.agents.executor_agent import run_executor
from app.agents.agent_output import AgentOutput
from typing import List

AGENT_MAP = {
    "coder": run_coder,
    "debugger": run_debugger,
    "executor": run_executor,
    "code_executor": run_executor, 
}

def run_multi_agent_system(user_query: str) -> dict:
    print(f"\n🧠 Planning task: {user_query}")

    plan = plan_task(user_query)
    steps = plan.get("steps", [])

    print(f"📋 Plan: {steps}")

    results: List[AgentOutput] = []
    previous_output = ""

    for step in steps:
        agent_name = step.get("agent", "coder")
        tools = step.get("tools", [])
        instruction = step.get("instruction", user_query)

        print(f"\n🤖 Running agent: {agent_name} with tools: {tools}")

        agent_fn = AGENT_MAP.get(agent_name, run_coder)

        # 👇 fixed: executor also gets previous_output
        if agent_name in ("debugger", "executor"):
            result = agent_fn(instruction, tools, previous_output)
        else:
            result = agent_fn(instruction, tools)

        previous_output = result.output
        results.append(result)

        print(f"✅ Agent {agent_name} done. Status: {result.status}")

    return {
        "query": user_query,
        "steps_executed": len(results),
        "results": [r.model_dump() for r in results],
        "final_output": results[-1].output if results else "No output generated"
    }