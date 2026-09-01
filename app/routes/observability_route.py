from fastapi import APIRouter, Query
from typing import Optional
from app.core.observability import metrics_tracker, log_tracker, trace_tracker, get_system_health

router = APIRouter(prefix="/api/observability", tags=["observability"])

@router.get("/overview")
def get_observability_overview():
    """Returns combined real-time metric summary and health state."""
    return {
        "metrics": metrics_tracker.get_summary(),
        "health": get_system_health()
    }

@router.get("/logs")
def get_system_logs(
    level: Optional[str] = Query(None, description="Log level filter (INFO, WARN, ERROR, SUCCESS, ALL)"),
    search: Optional[str] = Query(None, description="Keyword search string"),
    limit: int = Query(100, ge=1, le=500, description="Max lines to return")
):
    """Returns recorded structured log events."""
    return {
        "logs": log_tracker.get_logs(level=level, search=search, limit=limit)
    }

@router.get("/traces")
def get_execution_traces(
    limit: int = Query(50, ge=1, le=200, description="Max trace spans")
):
    """Returns recorded trace spans for RAG, Agent, and LLM calls."""
    return {
        "spans": trace_tracker.get_spans(limit=limit)
    }

@router.get("/health")
def get_health_check():
    """Detailed health diagnostic endpoint."""
    return get_system_health()

@router.post("/logs/clear")
def clear_logs():
    """Clears the in-memory log buffer."""
    log_tracker.clear()
    log_tracker.add_event(level="INFO", component="SYSTEM", message="Log buffer cleared by user action")
    return {"status": "success", "message": "Log buffer cleared"}
