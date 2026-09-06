import time
from langsmith import traceable

from app.rag.hybrid_retriever import HybridRetriever
from app.rag.reranker import Reranker
from app.core.observability import metrics_tracker, log_tracker, trace_tracker

import re

# Initialize singletons for hybrid search (BM25 + FAISS Vector) and Cross-Encoder reranking
hybrid_retriever = HybridRetriever()
reranker = Reranker()

# Helper function to extract metadata headers (# FILE:, # NAME:) from code chunks
# and reformat them into clean, human/LLM-readable Markdown code blocks
def clean_chunk(chunk: str) -> str:
    # Extract file path and function/class symbol name from the chunk header if present
    file_match = re.search(r'(?:#\s*FILE:|FILE:|#\s*File:)\s*(.*?)\n', chunk)
    name_match = re.search(r'#\s*NAME:\s*(.*?)\n', chunk)

    file_path = file_match.group(1).strip() if file_match else ""
    symbol_name = name_match.group(1).strip() if name_match else ""

    # Remove raw header lines from the chunk body
    body = re.sub(r'(?:#\s*FILE:|FILE:|#\s*File:|#\s*TYPE:|#\s*NAME:|SOURCE:).*?\n', '', chunk).strip()

    # Build a clean Markdown header (e.g. ### File: app/main.py | Symbol: startup_event)
    header_parts = []
    if file_path:
        header_parts.append(f"File: {file_path}")
    if symbol_name:
        header_parts.append(f"Symbol: {symbol_name}")

    header_str = f"### {' | '.join(header_parts)}\n" if header_parts else ""
    # Wrap the code body in markdown syntax highlighting
    return f"{header_str}```\n{body}\n```"

# Main RAG Query Pipeline: Retrieves relevant code snippets from the repository for a given query
@traceable(name="RAG Retrieval")
def query_rag(query: str) -> str:
    start = time.time()
    
    # Step 1: Hybrid Search (keyword BM25 + semantic vector search) to fetch top 20 candidate chunks
    docs = hybrid_retriever.search(query, k=20)
    texts = [d["text"] if isinstance(d, dict) else d for d in docs]
    
    # Step 2: Rerank the 20 candidates using a Cross-Encoder AI model to get the top 8 most accurate snippets
    texts = reranker.rerank(query, texts, top_k=8)
    
    # Step 3: Format the top 8 snippets nicely into Markdown
    clean_docs = [clean_chunk(doc) for doc in texts]
    context = "\n\n---\n\n".join(clean_docs)
    
    # Calculate execution time in milliseconds
    duration_ms = (time.time() - start) * 1000
    doc_count = len(clean_docs)
    
    # Step 4: Record observability metrics, tracing span, and structured logs
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
    
    # Return formatted context string ready to be injected into the LLM prompt
    return context


