from app.memory.short_term_memory import ShortTermMemory
from app.memory.long_term_memory import LongTermMemory
from app.memory.memory_schema import MemoryItem


class MemoryService:
    def __init__(self):
        self.short_term = ShortTermMemory()
        self.long_term = LongTermMemory()

    def store_interaction(self, user_id, session_id, role, content):
        memory = MemoryItem(
            user_id=user_id,
            session_id=session_id,
            role=role,
            content=content,
        )

        # store in both
        self.short_term.add(session_id, memory)
        self.long_term.add(memory)

    def get_context(self, user_id, session_id, query):
        short_mem = self.short_term.get(session_id)

        long_mem = self.long_term.search(query)

        return {
            "short_term": short_mem,
            "long_term": long_mem,
        }