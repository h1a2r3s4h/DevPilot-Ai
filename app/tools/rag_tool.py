from crewai.tools import BaseTool
from app.services.rag_service import query_rag  # use your existing function


class RAGTool(BaseTool):
    name: str = "Knowledge Base Search"
    description: str = (
        "Use this tool to search the codebase, documents, or uploaded files "
        "to get relevant context before answering."
    )

    def _run(self, query: str) -> str:
        results = query_rag(query)  # your FAISS search
        return results