from app.rag.hybrid_retriever import HybridRetriever
from app.rag.reranker import Reranker
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

def query_rag(query: str) -> str:
    docs = hybrid_retriever.search(query, k=20)
    texts = [d["text"] if isinstance(d, dict) else d for d in docs]
    texts = reranker.rerank(query, texts, top_k=8)
    clean_docs = [clean_chunk(doc) for doc in texts]
    context = "\n\n---\n\n".join(clean_docs)
    return context
