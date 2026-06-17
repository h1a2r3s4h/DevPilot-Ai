# app/rag/bm25_retriever.py

from rank_bm25 import BM25Okapi
import re

def tokenizer(text):
    return re.findall(r"[A-Za-z_][A-Za-z0-9_]*",text.lower())


class BM25Retriever:
    def __init__(self):
        self.bm25 = None
        self.documents = []

    def add_documents(self, chunks):
        if not chunks:
            return

        self.documents = chunks

        tokenized_docs = [
            tokenizer(doc)
            for doc in chunks
        ]

        self.bm25 = BM25Okapi(
            tokenized_docs
        )

    def search(self, query, k=5):
        if self.bm25 is None:
            pass
            return []

        tokenized_query = tokenizer(query)

        scores = self.bm25.get_scores(
            tokenized_query
        )

        ranked = sorted(
            zip(self.documents, scores),
            key=lambda x: x[1],
            reverse=True
        )

        pass
        pass

        return ranked[:k]