from app.tools.base_tool import BaseTool
from app.services.rag_service import retriever

class RAGSearchTool(BaseTool):
    name = "rag_search"
    description = "Search the indexed codebase for relevant code or documentation"

    def run(self, query: str) -> str:
        results = retriever.retrieve(query)
        if not results:
            return "No relevant context found."
        return "\n\n".join([
            f"[{r['metadata'].get('source', 'unknown')}]\n{r['text']}"
            for r in results
        ])