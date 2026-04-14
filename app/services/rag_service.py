from app.rag.retriever import Retriever

retriever = Retriever()
def query_rag(query: str) -> str:
    docs = search_faiss(query)  # your existing function

    return "\n\n".join([doc["content"] for doc in docs])