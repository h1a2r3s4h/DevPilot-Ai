from pydantic import BaseModel
from typing import List, Optional

class AgentOutput(BaseModel):
    agent: str
    status: str          # "success" | "error" | "needs_review"
    output: str
    tools_used: List[str] = []
    next_agent: Optional[str] = None   # dynamic routing signal
    confidence: float = 1.0