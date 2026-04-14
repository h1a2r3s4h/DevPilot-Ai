from abc import ABC, abstractmethod
from typing import Any

class BaseTool(ABC):
    name: str
    description: str

    @abstractmethod
    def run(self, input: str) -> Any:
        pass

    def __repr__(self):
        return f"Tool({self.name})"