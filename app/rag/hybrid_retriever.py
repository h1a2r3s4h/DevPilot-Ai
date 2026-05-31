from app.rag.bm25_retriever import BM25Retriever
from app.rag.retriever import Retriever
from app.services.cache_service import get_cache, set_cache


class HybridRetriever:

    def __init__(self):
        self.bm25 = BM25Retriever()
        self.vector = Retriever()

    def add_documents(
        self,
        chunks,
        metadatas=None
    ):
        self.bm25.add_documents(chunks)
        self.vector.add_documents(
            chunks,
            metadatas
        )

    def retrieve(
        self,
        query,
        k=15
    ):
        return self.search(query, k)

    def search(
        self,
        query,
        k=15
    ):

        cache_key = f"search:{query}"

        cached_results = get_cache(cache_key)

        if cached_results:
            return cached_results

        bm25_results = self.bm25.search(
            query,
            k
        )

        vector_results = self.vector.retrieve(
            query,
            k
        )

        merged = []
        seen = set()

        # BM25 Results
        for doc, score in bm25_results:

            if doc not in seen:

                merged.append(
                    {
                        "text": doc,
                        "metadata": {
                            "source": "bm25"
                        }
                    }
                )

                seen.add(doc)

        # FAISS Results
        for item in vector_results:

            text = item.get(
                "text",
                ""
            )

            if text and text not in seen:

                merged.append(item)

                seen.add(text)

        final_results = merged[:15]

        set_cache(
            cache_key,
            final_results,
            ttl=1800
        )

        return final_results