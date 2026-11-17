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

    cache_key = "rag:" + hashlib.md5(body.prompt.encode("utf-8")).hexdigest()

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

    final_prompt = f"""You are DevPilot AI, a senior, elite software engineer analyzing a real codebase.

Instructions:
- Provide a structured, highly professional response. Use sections like "Analysis", "Implementation Details", or "Recommendations" where appropriate.
- To make complex flows, logic, sequence of operations, and architectures highly structured and easy to understand, ALWAYS generate a styled Mermaid flowchart (enclosed in a ```mermaid code block) where applicable.
- Answer directly without preambles (e.g., do NOT start with "Based on the repository context...").
- Use clean, premium markdown with headings, lists, and formatted code blocks.
- Reference exact file names and paths from the context to support your statements.
- If the answer cannot be found in the provided context, state that clearly.
- Do NOT repeat or quote raw document file headers/metadata.

Recent Conversation Context:
{past_convo}

Repository Context:
{context}

Question: {body.prompt}
"""

    def token_generator():
        full_answer = ""
        for token in stream_llm_response(final_prompt):
            full_answer += token
            yield f"data: {json.dumps(token)}\n\n"

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
