from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import query_rag
from app.services.agent_service import ask_llm
from app.core.guardrails import guardrails

router = APIRouter()


class PromptRequest(BaseModel):
    prompt: str
    user_id: str = "default_user"
    session_id: str = "default_session"


@router.post("/ask")
def ask_question(request: PromptRequest):
    # 1. Inspect prompt for safety & injection attacks
    guard_check = guardrails.inspect_prompt(request.prompt)
    if not guard_check.is_safe:
        return {
            "response": f"🛡️ **Security Guardrail**: {guard_check.reason}"
        }

    context = query_rag(
        request.prompt
    )

    final_prompt = f"""You are DevPilot AI, an elite senior software architect analyzing a codebase.

Instructions:
- Provide an executive-level, structured, highly professional response.
- Organize your answer with clear markdown headings (e.g., '### Overview', '### Implementation Details', '### Architecture & Flow').
- Where applicable (for sequence of steps, component interactions, or system workflows), ALWAYS generate a clean Mermaid diagram inside a ```mermaid code block.
- Reference exact file names, classes, and methods from the context to support your statements.
- Answer directly without robotic filler phrases (NEVER say "Based on the provided repository context...").
- If the context doesn't contain the answer, state that honestly.

Context:
{context}

Question: {request.prompt}

Answer:"""

    result = ask_llm(
        request.user_id,
        request.session_id,
        final_prompt
    )

    # 2. Redact sensitive credentials if any leaked in answer
    sanitized_response = guardrails.redact_secrets(str(result))

    return {
        "response": sanitized_response
    }
