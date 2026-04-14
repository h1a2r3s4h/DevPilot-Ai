from collections import defaultdict
from typing import List
from .memory_schema import MemoryItem


class ShortTermMemory:
    def __init__(self):
        self.memory_store = defaultdict(list)

    def add(self, session_id: str, memory: MemoryItem):
        self.memory_store[session_id].append(memory)

    def get(self, session_id: str, limit: int = 10) -> List[MemoryItem]:
        return self.memory_store[session_id][-limit:]

    def clear(self, session_id: str):
        self.memory_store[session_id] = []