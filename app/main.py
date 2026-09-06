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

# Load environment variables (like API keys) from a .env file into Python's environment
load_dotenv()

# Create the main FastAPI application instance which handles all API requests
app = FastAPI(title="DevPilot AI Gateway")

# 1. Telemetry Middleware: Logs incoming HTTP requests and response times for observability
app.add_middleware(TelemetryMiddleware)

# 2. CORS Middleware: Allows frontend web apps (like React/Next.js) running on different ports to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any web page (ideal for local dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Rate Limiter: Attaches rate limiting to prevent spam/abuse of API endpoints
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Runs automatically when the backend server starts up
@app.on_event("startup")
def startup_event():
    # Log system startup event for monitoring
    log_tracker.add_event(level="INFO", component="SYSTEM", message="DevPilot AI FastAPI server initialized with Telemetry & Observability")
    # Start watching the workspace directory for file changes in real-time
    from app.services.watcher_service import workspace_watcher
    workspace_watcher.start()

# Runs automatically when the backend server shuts down
@app.on_event("shutdown")
def shutdown_event():
    # Gracefully stop the file watcher service
    from app.services.watcher_service import workspace_watcher
    workspace_watcher.stop()

# Custom error handler when a user makes too many API requests in a short time
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded. Try again in a minute."}
    )

# Register all API routes (endpoints for asking questions, uploading repos, running agents, streaming, etc.)
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