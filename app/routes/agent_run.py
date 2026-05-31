from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.limiter import limiter

from app.agents.orchestrator import run_multi_agent_system

import json

router = APIRouter()




class AgentRequest(BaseModel):
    query: str


@router.post("/agent/run")
def run_agent(
    body: AgentRequest
):
    return run_multi_agent_system(
        body.query
    )


@router.post("/agent/run/stream")
# @limiter.limit("5/minute")
def run_agent(
    request: Request,
    body: AgentRequest
):

    def event_generator():

        result = run_multi_agent_system(
            body.query
        )

        for step in result["results"]:

            chunk = {
                "agent": step["agent"],
                "status": step["status"],
                "output": step["output"],
            }

            yield (
                f"data: "
                f"{json.dumps(chunk)}"
                f"\n\n"
            )

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )