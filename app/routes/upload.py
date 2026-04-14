from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.rag_service import retriever
from pypdf import PdfReader

router = APIRouter()


def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        chunk = text[start:end]

        if end < text_length:
            last_period = chunk.rfind(".")
            if last_period != -1:
                end = start + last_period + 1
                chunk = text[start:end]

        chunks.append(chunk.strip())
        start += chunk_size - overlap

    return chunks


def read_file(file: UploadFile):
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        reader = PdfReader(file.file)
        text = ""

        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"

        return text

    elif filename.endswith((".txt", ".py", ".md")):
        return file.file.read().decode("utf-8", errors="ignore")

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        text = read_file(file)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Empty file")

        chunks = chunk_text(text)

        retriever.add_documents(chunks)

        return {
            "message": "File processed successfully",
            "chunks": len(chunks)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))