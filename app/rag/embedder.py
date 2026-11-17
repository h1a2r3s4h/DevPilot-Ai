from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        return self._model

    def embed(self, texts: list[str], batch_size: int = 64):
        embeddings = self.model.encode(
            texts, 
            batch_size=batch_size, 
            normalize_embeddings=True, 
            show_progress_bar=False
        )
        return embeddings.tolist()

_embedder = Embedder()

def get_embedding(text: str):
    return _embedder.embed([text])[0]

