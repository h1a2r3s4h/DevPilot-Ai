import faiss
import numpy as np
import os
import pickle

class VectorStore:
    def __init__(self, dim=384, index_path="faiss_index"):
        self.dim = dim
        self.index_path = index_path
        self.index_file = f"{index_path}.index"
        self.meta_file = f"{index_path}.pkl"
        if os.path.exists(self.index_file) and os.path.exists(self.meta_file):
            self.load()
        else:
            self.index = faiss.IndexFlatL2(dim)
            self.texts = []
            self.metadata = []

    def add(self, embeddings, texts, metadatas=None):
        vectors = np.array(embeddings).astype("float32")
        self.index.add(vectors)
        self.texts.extend(texts)
        if metadatas:
            self.metadata.extend(metadatas)
        else:
            self.metadata.extend([{}] * len(texts))
        self.save()

    def search(self, query_embedding, k=3):
        if self.index.ntotal == 0:
            return []
        k = min(k, self.index.ntotal)
        query = np.array([query_embedding]).astype("float32")
        distances, indices = self.index.search(query, k)
        results = []
        for i in indices[0]:
            if 0 <= i < len(self.texts):
                results.append({
                    "text": self.texts[i],
                    "metadata": self.metadata[i]
                })
        return results

    def save(self):
        faiss.write_index(self.index, self.index_file)
        with open(self.meta_file, "wb") as f:
            pickle.dump({
                "texts": self.texts,
                "metadata": self.metadata
            }, f)

    def load(self):
        self.index = faiss.read_index(self.index_file)
        with open(self.meta_file, "rb") as f:
            data = pickle.load(f)
        self.texts = data["texts"]
        self.metadata = data["metadata"]
