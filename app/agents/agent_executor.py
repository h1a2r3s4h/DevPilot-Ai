from app.tools.tool_registry import tool_registry
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response

def run_executor(instruction: str, tools: list, previous_output: str = "") -> AgentOutput:
    """
    Extracts code from previous agent output, runs it, returns real result.
    """
    tools_used = []

    # Step 1: Extract runnable code from previous output
    extract_prompt = f"""
Extract ONLY the raw Python code from the text below.
No explanation, no markdown fences, just raw executable Python code.

Text:
{previous_output if previous_output else instruction}
"""
    raw_code = get_llm_response(extract_prompt)

    # Step 2: Execute it
    executor = tool_registry.get("code_executor")
    if not executor:
        return AgentOutput(
            agent="executor",
            status="error",
            output="code_executor tool not found",
            tools_used=[],
        )

    execution_result = executor.run(raw_code)
    tools_used.append("code_executor")

    # Step 3: Let LLM interpret the result
    interpret_prompt = f"""
You ran this code:
{raw_code}

Execution result:
{execution_result}

Summarize what happened and whether the code works correctly.
"""
    summary = get_llm_response(interpret_prompt)

    return AgentOutput(
        agent="executor",
        status="success" if "✅" in execution_result else "error",
        output=f"{execution_result}\n\n{summary}",
        tools_used=tools_used,
        next_agent=None
    )