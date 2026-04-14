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

limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

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