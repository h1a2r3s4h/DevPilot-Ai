from fastapi import FastAPI
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from app.routes.ask import router as ask_router
from app.routes.upload import router as upload_router
from app.routes.upload_repo import router as upload_repo_router
from app.routes.stream import router as stream_router
from app.routes.agent_run import router as agent_run_router
from app.routes.mcp_route import router as mcp_router
from app.routes.upload_repo import router as repo_router
from app.routes.execution_route import router as execution_router
from app.routes.diff_route import router as diff_router
from app.routes.observability_route import router as observability_router
from app.core.telemetry_middleware import TelemetryMiddleware
from app.core.observability import log_tracker
from fastapi.middleware.cors import CORSMiddleware
from app.core.limiter import limiter
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="DevPilot AI Gateway")
app.add_middleware(TelemetryMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.on_event("startup")
def startup_event():
    log_tracker.add_event(level="INFO", component="SYSTEM", message="DevPilot AI FastAPI server initialized with Telemetry & Observability")
    from app.services.watcher_service import workspace_watcher
    workspace_watcher.start()

@app.on_event("shutdown")
def shutdown_event():
    from app.services.watcher_service import workspace_watcher
    workspace_watcher.stop()

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded. Try again in a minute."}
    )

app.include_router(upload_router)
app.include_router(ask_router)
app.include_router(upload_repo_router)
app.include_router(stream_router)
app.include_router(agent_run_router)
app.include_router(mcp_router)
app.include_router(repo_router)
app.include_router(execution_router)
app.include_router(diff_router)
app.include_router(observability_router)