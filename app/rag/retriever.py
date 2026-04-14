import numpy as np
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore

class Retriever:
    def __init__(self):
        self.embedder = Embedder()
        self.store = VectorStore()

    def add_documents(self, chunks, metadatas=None):
        if not chunks:
            return
        embeddings = self.embedder.embed(chunks)
        embeddings = np.array(embeddings).astype("float32")
        if embeddings.ndim == 1:
            embeddings = embeddings.reshape(1, -1)
        self.store.add(embeddings, chunks, metadatas)

    def retrieve(self, query, k=3):
        query_embedding = self.embedder.embed([query])[0]
        return self.store.search(query_embedding, k)

retriever = Retriever()
