import hashlib

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.rag_service import hybrid_retriever as retriever
from app.services.llm_provider import stream_llm_response
from app.services.cache_service import get_cache, set_cache
from app.core.limiter import limiter
router = APIRouter()


class StreamRequest(BaseModel):
    prompt: str


@router.post("/ask/stream")
@limiter.limit("20/minute")
def ask_stream(request: Request, body: StreamRequest):

    # Redis Cache Key
    cache_key = (
        "rag:"
        + hashlib.md5(
            body.prompt.encode("utf-8")
        ).hexdigest()
    )

    # Check Cache First
    cached_response = get_cache(cache_key)

    if cached_response:

        def cached_generator():
            yield f"data: {cached_response}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    # Retrieve Context
    results = retriever.retrieve(body.prompt)

    context_parts = []

    for r in results:
        if isinstance(r, dict):
            context_parts.append(
                r.get("text", "")
            )
        elif isinstance(r, str):
            context_parts.append(r)

    context = "\n\n".join(context_parts)

    # Build Final Prompt
    final_prompt = f"""
You are DevPilot AI, an expert software engineer analyzing a real code repository.

Rules:
- Answer ONLY from the repository context.
- Mention file names whenever available.
- Explain architecture clearly.
- Use bullet points.
- Do not invent files, functions, or features.
- If information is missing, say:
  "I couldn't find that in the indexed repository."

Repository Context:
{context}

User Question:
{body.prompt}

Format:
1. Direct answer
2. Relevant files
3. Technical explanation
"""

    # Stream LLM Response + Cache Result
    def token_generator():

        full_answer = ""

        for token in stream_llm_response(final_prompt):
            full_answer += token
            yield f"data: {token}\n\n"

        # Save complete response to Redis
        set_cache(
            cache_key,
            full_answer
        )

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )