from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.rag_service import hybrid_retriever as retriever
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

    context_parts = []

    for r in results:

        if isinstance(r, dict):
            context_parts.append(
                r.get("text", "")
            )

        elif isinstance(r, str):
            context_parts.append(r)

    context = "\n\n".join(context_parts)

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
            "Connection": "keep-alive"
        }
    )