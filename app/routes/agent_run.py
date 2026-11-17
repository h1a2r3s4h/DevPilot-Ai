import time
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.limiter import limiter
from app.agents.orchestrator import run_multi_agent_system
from app.core.observability import metrics_tracker, log_tracker, trace_tracker

from app.core.guardrails import guardrails
import json

router = APIRouter()

class AgentRequest(BaseModel):
    query: str
    user_id: str = "default_user"
    session_id: str = "default_session"

@router.post("/agent/run")
def run_agent(
    body: AgentRequest
):
    guard_check = guardrails.inspect_prompt(body.query)
    if not guard_check.is_safe:
        return {
            "query": body.query,
            "steps_executed": 0,
            "results": [],
            "final_output": f"🛡️ **Security Guardrail Block**: {guard_check.reason}"
        }

    start = time.time()
    try:
        res = run_multi_agent_system(body.query)
        duration_ms = (time.time() - start) * 1000
        steps = len(res.get("results", []))
        metrics_tracker.record_agent_run(steps=steps, is_error=False)
        trace_tracker.record_span(
            name=f"Multi-Agent Execution ({steps} steps)",
            span_type="AGENT",
            duration_ms=duration_ms,
            status="SUCCESS",
            metadata={"query": body.query[:80], "steps": steps}
        )
        log_tracker.add_event(
            level="INFO",
            component="AGENT",
            message=f"Agent workflow completed {steps} steps in {duration_ms:.1f}ms",
            details={"steps": steps, "duration_ms": round(duration_ms, 2)}
        )
        return res
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        metrics_tracker.record_agent_run(steps=0, is_error=True)
        trace_tracker.record_span(
            name="Multi-Agent Execution (Error)",
            span_type="AGENT",
            duration_ms=duration_ms,
            status="ERROR",
            metadata={"error": str(e)}
        )
        log_tracker.add_event(
            level="ERROR",
            component="AGENT",
            message=f"Agent workflow failed: {e}",
            details={"error": str(e)}
        )
        raise e

@router.post("/agent/run/stream")
def run_agent_stream(
    request: Request,
    body: AgentRequest
):
    def event_generator():
        start = time.time()
        guard_check = guardrails.inspect_prompt(body.query)
        if not guard_check.is_safe:
            chunk = {
                "agent": "guardrail",
                "status": "error",
                "output": f"🛡️ **Security Guardrail Block**: {guard_check.reason}",
            }
            yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            result = run_multi_agent_system(body.query)
            steps = result.get("results", [])
            
            for step in steps:
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
            
            duration_ms = (time.time() - start) * 1000
            metrics_tracker.record_agent_run(steps=len(steps), is_error=False)
            trace_tracker.record_span(
                name=f"Multi-Agent Stream ({len(steps)} steps)",
                span_type="AGENT",
                duration_ms=duration_ms,
                status="SUCCESS",
                metadata={"steps": len(steps)}
            )
            log_tracker.add_event(
                level="INFO",
                component="AGENT",
                message=f"Agent SSE stream finished in {duration_ms:.1f}ms",
                details={"duration_ms": round(duration_ms, 2), "steps": len(steps)}
            )
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            metrics_tracker.record_agent_run(steps=0, is_error=True)
            trace_tracker.record_span(
                name="Multi-Agent Stream (Error)",
                span_type="AGENT",
                duration_ms=duration_ms,
                status="ERROR",
                metadata={"error": str(e)}
            )
            log_tracker.add_event(
                level="ERROR",
                component="AGENT",
                message=f"Agent SSE stream failed: {e}",
                details={"error": str(e)}
            )
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )