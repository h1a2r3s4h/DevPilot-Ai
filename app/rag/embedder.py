from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer("BAAI/bge-small-en-v1.5")

    def embed(self, texts: list[str]):
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

_embedder = Embedder()

def get_embedding(text: str):
    return _embedder.embed([text])[0]

