import hashlib
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.rag_service import query_rag
from app.services.llm_provider import stream_llm_response
from app.services.cache_service import get_cache, set_cache
from app.core.limiter import limiter
from app.core.guardrails import guardrails
from app.memory.memory_service import MemoryService

router = APIRouter()
memory_service = MemoryService()

class StreamRequest(BaseModel):
    prompt: str
    user_id: str = "default_user"
    session_id: str = "default_session"
    model: str | None = None

@router.post("/ask/stream")
@limiter.limit("20/minute")
def ask_stream(request: Request, body: StreamRequest):
    # 1. Guardrail inspection
    guard_check = guardrails.inspect_prompt(body.prompt)
    if not guard_check.is_safe:
        def blocked_generator():
            msg = f"🛡️ **Security Guardrail Block**: {guard_check.reason}"
            yield f"data: {json.dumps(msg)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(
            blocked_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    cache_key = f"rag:{body.model or 'default'}:" + hashlib.md5(body.prompt.encode("utf-8")).hexdigest()

    cached_response = get_cache(cache_key)
    if cached_response:
        def cached_generator():
            yield f"data: {json.dumps(cached_response)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    context = query_rag(body.prompt)

    # Fetch conversational session memory context if available
    mem_ctx = memory_service.get_context(body.user_id, body.session_id, body.prompt)
    short_mem = mem_ctx.get("short_term", [])
    past_convo = "\n".join([f"{m.role}: {m.content}" for m in short_mem[-4:]]) if short_mem else "None"

    final_prompt = f"""You are DevPilot AI, an elite software engineer and codebase assistant.

OPERATIONAL INSTRUCTIONS:
1. DIRECT & FOCUSED ANSWER:
   - Answer ONLY what the user asked. Keep the response proportional to the question.
   - Do NOT add unsolicited boilerplate, generic overviews, or unrequested 5-part essays if the user asked a specific or simple question.
   - Jump straight to the technical answer without robotic filler (never start with "Based on the provided context...").

2. CODE GROUNDING:
   - Reference exact file paths (`app/routes/ask.py`, `ui/src/...`) and line details whenever citing code.
   - Provide production-ready, typed code snippets where relevant.

3. DIAGRAMS & FLOWCHARTS (ONLY WHEN RELEVANT):
   - Include a Mermaid diagram (```mermaid ... ```) ONLY IF:
     * The user explicitly asks for a diagram, flowchart, architecture, or visual map, OR
     * The question specifically asks about a multi-step request flow or system pipeline.
   - DO NOT include a diagram for simple, localized, or factual questions.
   - When generating a Mermaid flowchart, strictly follow:
     * Header: `flowchart LR` or `flowchart TD`
     * Arrows: ALWAYS use `-->` (TWO dashes). NEVER use `->`.
     * Node labels: ALWAYS quote text inside brackets: `NodeId["Label Text"]`.
     * Line breaks in labels: Use `<br/>` for multiple lines. NEVER use raw `\n` or newlines inside node text.
     * Special characters: NEVER use backticks (`) or unescaped HTML tags (like <b>) inside labels.
     * Single Diagram rule: Generate AT MOST ONE clean, valid Mermaid diagram. Do not repeat diagram blocks.
     * No Meta-Commentary: NEVER write sentences explaining or acknowledging Mermaid rules (e.g. NEVER write "The diagram follows the required syntax...", "Here is the diagram syntax:", or cite flowchart rules in prose). Output only the diagram itself.
     * File paths: ALWAYS quote: `PathNode["/app/routes/stream.py"]`.
     * Subgraphs: Quote title: `subgraph "Layer Name"` ... `end`.

Recent Conversation Context:
{past_convo}

Repository Context:
{context}

Question: {body.prompt}

Answer:"""

    def token_generator():
        full_answer = ""
        for token in stream_llm_response(final_prompt, model=body.model):
            full_answer += token
            yield f"data: {json.dumps(token)}\n\n"

        if not full_answer.strip():
            fallback = "⚠️ **Model Notice**: No tokens were streamed from upstream provider. Please check OpenRouter connection or click **Regenerate**."
            full_answer = fallback
            yield f"data: {json.dumps(fallback)}\n\n"

        # Redact secrets and store interaction into session memory
        sanitized_answer = guardrails.redact_secrets(full_answer)
        set_cache(cache_key, sanitized_answer)
        try:
            memory_service.store_interaction(body.user_id, body.session_id, "user", body.prompt)
            memory_service.store_interaction(body.user_id, body.session_id, "assistant", sanitized_answer)
        except Exception:
            pass

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
