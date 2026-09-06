from app.rag.bm25_retriever import BM25Retriever
from app.rag.retriever import Retriever
from app.services.cache_service import get_cache, set_cache

# HybridRetriever combines two search methods for best accuracy:
# 1. BM25 (Keyword Search): Finds exact text/variable matches.
# 2. FAISS Vector Search (Semantic Search): Finds code with similar meaning even if exact words differ.
class HybridRetriever:

    def __init__(self):
        # Initialize keyword searcher (BM25) and vector searcher (FAISS)
        self.bm25 = BM25Retriever()
        self.vector = Retriever()

        # If vector store already has existing documents loaded, sync them to BM25
        if hasattr(self.vector.store, "texts") and self.vector.store.texts:
            self.bm25.add_documents(self.vector.store.texts)
            pass

    # Add new code chunks and their metadata to both keyword (BM25) and vector (FAISS) stores
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

    # Alias for search()
    def retrieve(
        self,
        query,
        k=15
    ):
        return self.search(query, k)

    # Hybrid Search using Reciprocal Rank Fusion (RRF) algorithm
    def search(
        self,
        query,
        k=15,
        rrf_k=60
    ):
        # 1. Check cache to return instant results if this exact query was searched recently
        cache_key = f"search:{query}"
        cached_results = get_cache(cache_key)
        if cached_results:
            return cached_results

        # 2. Fetch top-k keyword search results (BM25)
        bm25_results = self.bm25.search(
            query,
            k
        )

        # 3. Fetch top-k vector search results (FAISS)
        vector_results = self.vector.retrieve(
            query,
            k
        )

        doc_map = {}
        rrf_scores = {}

        # 4. Calculate RRF Score for BM25 keyword results
        # Formula: score += 1 / (60 + rank)
        for rank, (doc, score) in enumerate(bm25_results):
            if not doc:
                continue
            if doc not in doc_map:
                doc_map[doc] = {
                    "text": doc,
                    "metadata": {"source": "bm25"}
                }
                rrf_scores[doc] = 0.0
            rrf_scores[doc] += 1.0 / (rrf_k + rank + 1)

        # 5. Calculate RRF Score for FAISS vector results and merge
        for rank, item in enumerate(vector_results):
            doc = item.get("text", "")
            if not doc:
                continue
            if doc not in doc_map:
                doc_map[doc] = item
                rrf_scores[doc] = 0.0
            else:
                # Prefer vector item metadata if it has detailed source paths
                if doc_map[doc].get("metadata", {}).get("source") == "bm25":
                    doc_map[doc] = item
            rrf_scores[doc] += 1.0 / (rrf_k + rank + 1)

        # 6. Sort all results by highest total RRF score
        sorted_docs = sorted(rrf_scores.keys(), key=lambda d: rrf_scores[d], reverse=True)
        final_results = [doc_map[d] for d in sorted_docs[:k]]

        # 7. Save merged search results to cache for 30 minutes (ttl=1800 seconds)
        set_cache(
            cache_key,
            final_results,
            ttl=1800
        )

        return final_results

    # Remove code chunks belonging to a deleted or modified file and refresh BM25 index
    def remove_file(self, file_path: str):
        self.vector.store.remove_by_metadata_path(file_path)
        if self.vector.store.texts:
            self.bm25.add_documents(self.vector.store.texts)
        else:
            self.bm25.bm25 = None
            self.bm25.documents = []