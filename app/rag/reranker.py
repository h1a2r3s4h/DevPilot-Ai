from sentence_transformers import CrossEncoder


class Reranker:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-6-v2"
            )
        return self._model

    def rerank(
        self,
        query,
        documents,
        top_k=5
    ):
        if not documents:
            return []

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