from app.tools.base_tool import BaseTool
from app.services.rag_service import hybrid_retriever as retriever


class RAGSearchTool(BaseTool):
    name = "rag_search"
    description = "Search the indexed codebase for relevant code or documentation"

    def run(self, query: str) -> str:

        results = retriever.retrieve(query)

        if not results:
            return "No relevant context found."

        output = []

        for r in results:

            text = r.get("text", "")

            metadata = r.get("metadata", {})

            source = metadata.get(
                "source",
                "unknown"
            )

            output.append(
                f"[{source}]\n{text}"
            )

        return "\n\n".join(output)