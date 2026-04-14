from fastapi import APIRouter
from pydantic import BaseModel
from app.services.rag_service import retriever
from app.services.agent_service import ask_llm

router = APIRouter()

class PromptRequest(BaseModel):
    prompt: str

@router.post("/ask")
def ask_question(request: PromptRequest):
    results = retriever.retrieve(request.prompt)
    context = "\n\n".join([r["text"] for r in results])
    sources = list(set([r["metadata"].get("source") for r in results]))
    final_prompt = f"""
    You are DevPilot AI, a developer assistant.
    Use the context below to answer the question.
    Context:
    {context}
    Question:
    {request.prompt}
    """
    result = ask_llm("default_user", "default_session", final_prompt)
    return {
        "response": result,
        "sources": sources
    }
