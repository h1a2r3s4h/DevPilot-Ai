from app.rag.hybrid_retriever import HybridRetriever
from app.rag.reranker import Reranker

hybrid_retriever = HybridRetriever()
reranker = Reranker()


def query_rag(query: str) -> str:
    # Hybrid Search (BM25 + FAISS)
    docs = hybrid_retriever.search(
        query,
        k=20
    )

    docs = reranker.rerank(
        query,
        docs,
        top_k=15
    )

    print("\n=== HYBRID RESULTS ===")
    print(docs)

    # Rerank Results
    docs = reranker.rerank(
        query,
        docs,
        top_k=8
    )

    print("\n=== RERANKED RESULTS ===")
    print(docs)

    # Final Context
    context = "\n\n".join(docs)

    return context