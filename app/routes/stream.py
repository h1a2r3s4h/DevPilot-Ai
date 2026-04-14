from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.rag_service import retriever
from app.services.llm_provider import stream_llm_response
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

class StreamRequest(BaseModel):
    prompt: str

@router.post("/ask/stream")
@limiter.limit("10/minute")
def ask_stream(request: Request, body: StreamRequest):
    results = retriever.retrieve(body.prompt)
    context = "\n\n".join([r["text"] for r in results])
    final_prompt = f"""
You are DevPilot AI, a developer assistant.
Use the context below to answer the question.

Context:
{context}

Question:
{body.prompt}
"""
    def token_generator():
        for token in stream_llm_response(final_prompt):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )