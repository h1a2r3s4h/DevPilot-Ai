import time
from langsmith import traceable

from app.rag.hybrid_retriever import HybridRetriever
from app.rag.reranker import Reranker
from app.core.observability import metrics_tracker, log_tracker, trace_tracker

import re

hybrid_retriever = HybridRetriever()
reranker = Reranker()

def clean_chunk(chunk: str) -> str:
    chunk = re.sub(r'#\s*FILE:.*?\n', '', chunk)
    chunk = re.sub(r'#\s*TYPE:.*?\n', '', chunk)
    chunk = re.sub(r'#\s*NAME:.*?\n', '', chunk)
    chunk = re.sub(r'#\s*File:.*?\n', '', chunk)
    chunk = re.sub(r'\nFILE:.*?\n', '', chunk)
    chunk = re.sub(r'\nSOURCE:.*?\n', '', chunk)
    return chunk.strip()

@traceable(name="RAG Retrieval")
def query_rag(query: str) -> str:
    start = time.time()
    docs = hybrid_retriever.search(query, k=20)
    texts = [d["text"] if isinstance(d, dict) else d for d in docs]
    texts = reranker.rerank(query, texts, top_k=8)
    clean_docs = [clean_chunk(doc) for doc in texts]
    context = "\n\n---\n\n".join(clean_docs)
    
    duration_ms = (time.time() - start) * 1000
    doc_count = len(clean_docs)
    
    metrics_tracker.record_rag_query(doc_count=doc_count, latency_ms=duration_ms)
    trace_tracker.record_span(
        name="Hybrid RAG Search & Rerank",
        span_type="RAG",
        duration_ms=duration_ms,
        metadata={"query_preview": query[:60], "retrieved_chunks": doc_count}
    )
    log_tracker.add_event(
        level="INFO",
        component="RAG",
        message=f"Hybrid search retrieved {doc_count} chunks for query ({duration_ms:.1f}ms)",
        details={"query": query[:100], "duration_ms": round(duration_ms, 2), "chunks": doc_count}
    )
    
    return context


