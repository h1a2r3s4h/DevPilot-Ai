from typing import List

from app.agents.planner_agent import plan_task
from app.agents.coder_agent import run_coder
from app.agents.reviewer_agent import run_reviewer
from app.agents.debugger_agent import run_debugger
from app.agents.executor_agent import run_executor
from app.agents.agent_output import AgentOutput

# Registry mapping agent roles to their execution callable
AGENT_MAP = {
    "coder": run_coder,
    "reviewer": run_reviewer,
    "debugger": run_debugger,
    "executor": run_executor,
    "code_executor": run_executor,
}


def run_multi_agent_system(user_query: str) -> dict:
    """Orchestrates dynamic multi-agent execution pipeline.
    
    1. Planner Agent builds structured PlanStep sequence via Instructor / Pydantic.
    2. Sequentially executes agents, passing prior agent outputs as context.
    3. Handles and isolates agent-level exceptions without halting pipeline.
    4. Aggregates results into a unified structured audit response.
    """
    plan = plan_task(user_query)
    steps = plan.get("steps", [])

    results: List[AgentOutput] = []

    # Record Planner output as first step in audit trail
    planner_summary = f"Architected execution plan with {len(steps)} steps:\n" + "\n".join([
        f"{i+1}. Agent: `{s.get('agent', 'coder')}` | Tools: {s.get('tools', [])} | Task: {s.get('instruction', '')}"
        for i, s in enumerate(steps)
    ])
    results.append(
        AgentOutput(
            agent="planner",
            status="success",
            output=planner_summary,
            tools_used=["planner_schema"],
            next_agent=steps[0].get("agent", "coder") if steps else None,
            confidence=1.0
        )
    )

    previous_output = ""

    for idx, step in enumerate(steps):
        agent_name = step.get("agent", "coder")
        tools = step.get("tools", [])
        instruction = step.get("instruction", user_query)

        agent_fn = AGENT_MAP.get(agent_name)
        if not agent_fn:
            continue

        try:
            # First agent (coder) initiates; subsequent agents consume previous outputs
            if agent_name == "coder":
                result = agent_fn(instruction, tools)
            else:
                result = agent_fn(instruction, tools, previous_output)

            previous_output = result.output
            results.append(result)

        except Exception as e:
            # Graceful error isolation: record failure state without crashing orchestrator
            results.append(
                AgentOutput(
                    agent=agent_name,
                    status="error",
                    output=str(e),
                    tools_used=tools,
                    next_agent=None,
                )
            )

    # -------------------------------------------------------------
    # 🔄 Autonomous Self-Healing Feedback Loop
    # If the executor fails or catches a runtime error/traceback,
    # trigger closed-loop self-correction between Debugger & Executor
    # -------------------------------------------------------------
    max_self_heal_iterations = 2
    heal_count = 0

    while heal_count < max_self_heal_iterations:
        last_result = results[-1] if results else None
        if not last_result:
            break

        is_failure = (
            last_result.status == "error"
            or "❌ Error" in last_result.output
            or "Traceback (most recent call last)" in last_result.output
            or "SyntaxError" in last_result.output
            or "ModuleNotFoundError" in last_result.output
        )

        if not is_failure:
            break

        heal_count += 1
        heal_prompt = (
            f"AUTONOMOUS REPAIR CYCLE #{heal_count}:\n"
            f"Execution failed with the following traceback/error:\n{last_result.output}\n\n"
            f"Original task: {user_query}\n"
            f"Diagnose the root cause, fix syntax or missing dependencies, and provide clean, working, verified Python code."
        )

        # 1. Dispatch to Debugger to find root cause and generate fixed code
        debugger_fix = run_debugger(heal_prompt, ["codebase_search"], previous_output=last_result.output)
        debugger_fix.agent = f"debugger (self-heal #{heal_count})"
        results.append(debugger_fix)

        # 2. Re-dispatch to Executor to verify if the fix runs cleanly
        retest_executor = run_executor(heal_prompt, ["code_executor"], previous_output=debugger_fix.output)
        retest_executor.agent = f"executor (verify #{heal_count})"
        results.append(retest_executor)

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
