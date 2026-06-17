import hashlib
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.rag_service import query_rag
from app.services.llm_provider import stream_llm_response
from app.services.cache_service import get_cache, set_cache
from app.core.limiter import limiter

router = APIRouter()

class StreamRequest(BaseModel):
    prompt: str

@router.post("/ask/stream")
@limiter.limit("20/minute")
def ask_stream(request: Request, body: StreamRequest):
    cache_key = "rag:" + hashlib.md5(body.prompt.encode("utf-8")).hexdigest()

    cached_response = get_cache(cache_key)
    if cached_response:
        def cached_generator():
            yield f"data: {cached_response}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    context = query_rag(body.prompt)

    final_prompt = f"""You are DevPilot AI, an expert software engineer analyzing a real code repository.

Rules:
- Answer directly without preamble like "Based on the context..."
- Use clean markdown: headers, bullet points, code blocks where appropriate
- Mention file names when relevant
- If information is missing, say "I couldn't find that in the indexed repository"
- Do NOT repeat or quote raw file metadata

Repository Context:
{context}

Question: {body.prompt}
"""

    def token_generator():
        full_answer = ""
        for token in stream_llm_response(final_prompt):
            full_answer += token
            yield f"data: {token}\n\n"
        set_cache(cache_key, full_answer)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )