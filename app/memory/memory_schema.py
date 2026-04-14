from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MemoryItem(BaseModel):
    user_id: str
    session_id: str
    role: str  # "user" | "assistant" | "agent"
    content: str
    timestamp: datetime = datetime.utcnow()