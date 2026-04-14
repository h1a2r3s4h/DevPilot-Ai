from typing import List
from app.rag.embedder import get_embedding
from app.rag.vector_store import VectorStore
from .memory_schema import MemoryItem

class LongTermMemory:
    def __init__(self):
        self.vector_store = VectorStore(index_path="memory_index")

    def add(self, memory: MemoryItem):
        embedding = get_embedding(memory.content)
        metadata = {
            "user_id": memory.user_id,
            "session_id": memory.session_id,
            "role": memory.role,
            "timestamp": str(memory.timestamp),
        }
        self.vector_store.add([embedding], [memory.content], [metadata])

    def search(self, query: str, k: int = 5):
        embedding = get_embedding(query)
        return self.vector_store.search(embedding, k=k)
