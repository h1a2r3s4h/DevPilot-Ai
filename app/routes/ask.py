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
    model: str | None = None


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

    final_prompt = f"""You are DevPilot AI, an elite software engineer and codebase assistant.

OPERATIONAL INSTRUCTIONS:
1. DIRECT & FOCUSED ANSWER:
   - Answer ONLY what the user asked. Keep the response proportional to the question.
   - Do NOT add unsolicited boilerplate, generic overviews, or unrequested 5-part essays if the user asked a specific or simple question.
   - Jump straight to the technical answer without robotic filler.

2. CODE GROUNDING:
   - Reference exact file paths (`app/...`, `ui/...`) whenever citing code.
   - Provide clean, typed code snippets where relevant.

3. DIAGRAMS & FLOWCHARTS (ONLY WHEN RELEVANT):
   - Include a Mermaid diagram (```mermaid ... ```) ONLY IF:
     * The user explicitly asks for a diagram, flowchart, architecture, or visual map, OR
     * The question is specifically about a multi-step pipeline or system interaction.
   - DO NOT include a diagram for simple, localized, or factual questions.
   - When generating a Mermaid flowchart, strictly follow:
     * Header: `flowchart LR` or `flowchart TD`
     * Arrows: ALWAYS use `-->` (TWO dashes). NEVER use `->`.
     * Node labels: ALWAYS quote text inside brackets: `NodeId["Label Text"]`.
     * Subgraphs: Quote title: `subgraph "Layer Name"` ... `end`.

Repository Context:
{context}

Question: {request.prompt}

Answer:"""

    result = ask_llm(
        request.user_id,
        request.session_id,
        final_prompt,
        model=request.model
    )

    # 2. Redact sensitive credentials if any leaked in answer
    sanitized_response = guardrails.redact_secrets(str(result))

    return {
        "response": sanitized_response
    }
