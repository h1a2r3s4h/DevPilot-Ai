from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import query_rag
from app.services.agent_service import ask_llm

router = APIRouter()


class PromptRequest(BaseModel):
    prompt: str


@router.post("/ask")
def ask_question(request: PromptRequest):

    context = query_rag(
        request.prompt
    )

    final_prompt = f"""You are DevPilot AI, an expert developer assistant.
Use ONLY the context below to answer. Be concise and use proper markdown formatting.
Do NOT say "Based on the provided repository context" — just answer directly.
If the context doesn't contain the answer, say so honestly.

Context:
{context}

Question: {request.prompt}

Answer:"""

    result = ask_llm(
        "default_user",
        "default_session",
        final_prompt
    )

    return {
        "response": result
    }