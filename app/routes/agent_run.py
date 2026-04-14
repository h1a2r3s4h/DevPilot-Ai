from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.orchestrator import run_multi_agent_system
import json

router = APIRouter()

class AgentRequest(BaseModel):
    query: str

@router.post("/agent/run")
def run_agent(request: AgentRequest):
    result = run_multi_agent_system(request.query)
    return result

# 👇 ADD THIS
@router.post("/agent/run/stream")
def run_agent_stream(request: AgentRequest):
    def event_generator():
        plan_sent = False
        result = run_multi_agent_system(request.query)

        # Stream each agent result as it comes
        for step in result["results"]:
            chunk = {
                "agent": step["agent"],
                "status": step["status"],
                "output": step["output"],
            }
            yield f"data: {json.dumps(chunk)}\n\n"

        # Final done signal
        yield f"data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )