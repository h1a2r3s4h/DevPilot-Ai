from app.tools.base_tool import BaseTool
from app.memory.memory_service import MemoryService

memory_service = MemoryService()

class MemoryTool(BaseTool):
    name = "memory_search"
    description = "Retrieve relevant past interactions from long-term memory"

    def run(self, query: str) -> str:
        results = memory_service.long_term.search(query, k=3)
        if not results:
            return "No memory found."
        return "\n".join([r["text"] for r in results])