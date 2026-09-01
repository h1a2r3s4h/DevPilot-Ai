import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.observability import metrics_tracker, log_tracker

class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        path = request.url.path

        # Ignore noise/static endpoint hits if any
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            metrics_tracker.record_request(path, 500, duration_ms)
            log_tracker.add_event(
                level="ERROR",
                component="HTTP",
                message=f"Unhandled HTTP Exception on {request.method} {path}: {str(exc)}",
                details={"method": request.method, "path": path, "error": str(exc)}
            )
            raise exc

        duration_ms = (time.time() - start_time) * 1000
        metrics_tracker.record_request(path, status_code, duration_ms)

        # Log notable requests or non-200 responses
        if status_code >= 400:
            log_tracker.add_event(
                level="WARN" if status_code < 500 else "ERROR",
                component="HTTP",
                message=f"{request.method} {path} returned {status_code} ({duration_ms:.1f}ms)",
                details={"status_code": status_code, "latency_ms": round(duration_ms, 2)}
            )
        elif path.startswith(("/ask", "/agent", "/upload", "/mcp", "/execution")):
            log_tracker.add_event(
                level="INFO",
                component="HTTP",
                message=f"{request.method} {path} - {status_code} ({duration_ms:.1f}ms)",
                details={"status_code": status_code, "latency_ms": round(duration_ms, 2)}
            )

        return response
