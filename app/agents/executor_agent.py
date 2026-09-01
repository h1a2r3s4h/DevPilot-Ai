import re
from app.tools.tool_registry import tool_registry
from app.agents.agent_output import AgentOutput
from app.services.llm_provider import get_llm_response

def clean_python_code(code_str: str) -> str:
    """Removes markdown code fences and strips trailing whitespace."""
    if not code_str:
        return ""
    # Extract code inside ```python ... ``` block if present
    match = re.search(r"```(?:python)?\s*(.*?)\s*```", code_str, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    code = code_str.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        code = "\n".join(lines).strip()
    return code

def run_executor(instruction: str, tools: list, previous_output: str = "") -> AgentOutput:
    tools_used = []

    # 1. Try extracting python code from previous agent output
    raw_code = clean_python_code(previous_output)

    # 2. If no valid code block found or previous output was plain text/error, generate code explicitly
    invalid_prefixes = ["no python", "there is no", "error", "sorry", "i cannot", "no code"]
    if not raw_code or len(raw_code) < 5 or any(raw_code.lower().startswith(p) for p in invalid_prefixes):
        extract_prompt = f"""
Write ONLY the raw, executable Python code required to complete this instruction:
"{instruction}"

Rules:
- Provide strictly executable Python code.
- Do NOT output any conversational text or markdown explanation.
"""
        raw_code = clean_python_code(get_llm_response(extract_prompt))

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

    interpret_prompt = f"""
You executed this Python code:
```python
{raw_code}
```

Execution result:
{execution_result}

Summarize what happened and state clearly if the code succeeded.
"""
    summary = get_llm_response(interpret_prompt)

    is_success = "✅" in execution_result and "Error" not in execution_result and "SyntaxError" not in execution_result

    return AgentOutput(
        agent="executor",
        status="success" if is_success else "error",
        output=f"{execution_result}\n\n**Summary:**\n{summary}",
        tools_used=tools_used,
        next_agent=None
    )
