import faiss
import numpy as np
import os
import pickle

class VectorStore:
    def __init__(self, dim=384, index_path=None):
        import os as _os
        if index_path is None:
            _base = _os.path.dirname(_os.path.abspath(__file__))
            index_path = _os.path.normpath(_os.path.join(_base, "..", "..", "faiss_index"))
        self.dim = dim
        self.index_path = index_path
        self.index_file = f"{index_path}.index"
        self.meta_file = f"{index_path}.pkl"
        if os.path.exists(self.index_file) and os.path.exists(self.meta_file):
            self.load()
        else:
            self.index = faiss.IndexFlatIP(dim)
            self.texts = []
            self.metadata = []

    def add(self, embeddings, texts, metadatas=None):
        vectors = np.array(embeddings).astype("float32")
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vectors = vectors / norms
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
        norm = np.linalg.norm(query)
        if norm > 0:
            query = query / norm
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

    def remove_by_metadata_path(self, path: str):
        indices_to_keep = [i for i, meta in enumerate(self.metadata) if meta.get("path") != path]
        if len(indices_to_keep) == len(self.metadata):
            return

        new_index = faiss.IndexFlatIP(self.dim)
        new_texts = []
        new_metadata = []

        if indices_to_keep:
            vectors = []
            for i in indices_to_keep:
                vec = self.index.reconstruct(i)
                vectors.append(vec)
            vectors_np = np.array(vectors).astype("float32")
            new_index.add(vectors_np)

            new_texts = [self.texts[i] for i in indices_to_keep]
            new_metadata = [self.metadata[i] for i in indices_to_keep]

        self.index = new_index
        self.texts = new_texts
        self.metadata = new_metadata
        self.save()
