from app.tools.rag_search_tool import RAGSearchTool
from app.tools.memory_tool import MemoryTool
from app.tools.code_execution_tool import CodeExecutionTool

class ToolRegistry:
    def __init__(self):
        self._tools = {}
        self._register_defaults()

    def _register_defaults(self):
        for tool in [RAGSearchTool(), MemoryTool(), CodeExecutionTool()]:
            self._tools[tool.name] = tool

    def get(self, name: str):
        return self._tools.get(name)

    def all(self):
        return self._tools

    def describe(self) -> str:
        return "\n".join([
            f"- {name}: {tool.description}"
            for name, tool in self._tools.items()
        ])

tool_registry = ToolRegistry()