from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            try:
                self._model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu", local_files_only=True)
            except Exception:
                try:
                    self._model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
                except Exception as e:
                    print(f"Warning: Embedder could not load BAAI model: {e}")
                    raise e
        return self._model

    def embed(self, texts: list[str], batch_size: int = 16):
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

