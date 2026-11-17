from sentence_transformers import CrossEncoder


class Reranker:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            try:
                self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu", local_files_only=True)
            except Exception:
                try:
                    self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
                except Exception as e:
                    print(f"Warning: Reranker could not load model: {e}")
                    raise e
        return self._model

    def rerank(
        self,
        query,
        documents,
        top_k=5
    ):
        if not documents:
            return []

        try:
            pairs = [
                (query, doc)
                for doc in documents
            ]

            scores = self.model.predict(
                pairs
            )

            ranked = sorted(
                zip(documents, scores),
                key=lambda x: x[1],
                reverse=True
            )

            return [
                doc
                for doc, score
                in ranked[:top_k]
            ]
        except Exception as e:
            print(f"[Reranker Fallback] CrossEncoder rerank failed ({e}), falling back to hybrid ranking.")
            return documents[:top_k]