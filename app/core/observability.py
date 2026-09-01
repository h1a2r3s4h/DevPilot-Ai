import time
import os
import sys
import logging
import threading
try:
    import psutil
except ImportError:
    psutil = None
from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime


# Start time tracking for uptime calculation
START_TIME = time.time()

class MetricsTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.request_count: int = 0
        self.error_count: int = 0
        self.route_hits: Dict[str, int] = {}
        self.status_codes: Dict[int, int] = {}
        self.latencies: deque = deque(maxlen=200)  # ms
        
        # LLM & RAG telemetry
        self.llm_calls: int = 0
        self.llm_estimated_tokens: int = 0
        self.llm_errors: int = 0
        
        self.rag_queries: int = 0
        self.rag_doc_retrievals: int = 0
        self.rag_latencies: deque = deque(maxlen=100)
        
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        
        self.agent_runs: int = 0
        self.agent_errors: int = 0
        self.agent_step_counts: int = 0

    def record_request(self, route: str, status_code: int, latency_ms: float):
        with self._lock:
            self.request_count += 1
            if status_code >= 400:
                self.error_count += 1
            self.route_hits[route] = self.route_hits.get(route, 0) + 1
            self.status_codes[status_code] = self.status_codes.get(status_code, 0) + 1
            self.latencies.append(latency_ms)

    def record_llm_call(self, tokens_estimated: int = 0, is_error: bool = False):
        with self._lock:
            self.llm_calls += 1
            self.llm_estimated_tokens += tokens_estimated
            if is_error:
                self.llm_errors += 1

    def record_rag_query(self, doc_count: int, latency_ms: float):
        with self._lock:
            self.rag_queries += 1
            self.rag_doc_retrievals += doc_count
            self.rag_latencies.append(latency_ms)

    def record_cache(self, hit: bool):
        with self._lock:
            if hit:
                self.cache_hits += 1
            else:
                self.cache_misses += 1

    def record_agent_run(self, steps: int = 1, is_error: bool = False):
        with self._lock:
            self.agent_runs += 1
            self.agent_step_counts += steps
            if is_error:
                self.agent_errors += 1

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            lats = list(self.latencies)
            avg_lat = round(sum(lats) / len(lats), 2) if lats else 0.0
            sorted_lats = sorted(lats) if lats else [0.0]
            p50 = round(sorted_lats[int(len(sorted_lats) * 0.50)], 2)
            p95 = round(sorted_lats[min(int(len(sorted_lats) * 0.95), len(sorted_lats) - 1)], 2)
            
            rag_lats = list(self.rag_latencies)
            avg_rag_lat = round(sum(rag_lats) / len(rag_lats), 2) if rag_lats else 0.0
            
            total_cache_ops = self.cache_hits + self.cache_misses
            cache_hit_rate = round((self.cache_hits / total_cache_ops) * 100, 1) if total_cache_ops > 0 else 0.0

            uptime_sec = int(time.time() - START_TIME)

            return {
                "uptime_seconds": uptime_sec,
                "total_requests": self.request_count,
                "total_errors": self.error_count,
                "error_rate_pct": round((self.error_count / self.request_count * 100), 2) if self.request_count > 0 else 0.0,
                "latency_ms": {
                    "avg": avg_lat,
                    "p50": p50,
                    "p95": p95,
                },
                "status_codes": self.status_codes,
                "top_routes": dict(sorted(self.route_hits.items(), key=lambda x: x[1], reverse=True)[:5]),
                "llm": {
                    "total_calls": self.llm_calls,
                    "estimated_tokens": self.llm_estimated_tokens,
                    "errors": self.llm_errors
                },
                "rag": {
                    "queries": self.rag_queries,
                    "docs_retrieved": self.rag_doc_retrievals,
                    "avg_retrieval_ms": avg_rag_lat
                },
                "cache": {
                    "hits": self.cache_hits,
                    "misses": self.cache_misses,
                    "hit_rate_pct": cache_hit_rate
                },
                "agent": {
                    "runs": self.agent_runs,
                    "steps": self.agent_step_counts,
                    "errors": self.agent_errors
                }
            }


class LogTracker(logging.Handler):
    """In-memory rotating log buffer that hooks directly into Python logging."""
    def __init__(self, maxlen: int = 500):
        super().__init__()
        self._lock = threading.Lock()
        self.logs: deque = deque(maxlen=maxlen)

    def emit(self, record: logging.LogRecord):
        try:
            log_entry = {
                "id": f"log-{time.time_ns()}",
                "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
                "level": record.levelname,
                "logger": record.name,
                "component": getattr(record, "component", record.module),
                "message": record.getMessage(),
                "details": getattr(record, "details", None)
            }
            with self._lock:
                self.logs.appendleft(log_entry)
        except Exception:
            self.handleError(record)

    def add_event(self, level: str, component: str, message: str, details: Optional[Dict[str, Any]] = None):
        log_entry = {
            "id": f"log-{time.time_ns()}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "level": level.upper(),
            "logger": "app.observability",
            "component": component,
            "message": message,
            "details": details
        }
        with self._lock:
            self.logs.appendleft(log_entry)

    def get_logs(self, level: Optional[str] = None, search: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self.logs)

        filtered = []
        for item in items:
            if level and level.upper() != "ALL" and item["level"] != level.upper():
                continue
            if search:
                search_lower = search.lower()
                if (search_lower not in item["message"].lower() and
                    search_lower not in item["component"].lower() and
                    search_lower not in item["level"].lower()):
                    continue
            filtered.append(item)
            if len(filtered) >= limit:
                break
        return filtered

    def clear(self):
        with self._lock:
            self.logs.clear()


class TraceTracker:
    """Records execution trace spans for RAG queries, Agent runs, and LLM calls."""
    def __init__(self, maxlen: int = 100):
        self._lock = threading.Lock()
        self.spans: deque = deque(maxlen=maxlen)

    def record_span(
        self,
        name: str,
        span_type: str,
        duration_ms: float,
        status: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None
    ):
        span = {
            "id": f"span-{time.time_ns()}",
            "name": name,
            "type": span_type,  # RAG, AGENT, LLM, CACHE, DOCKER
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": round(duration_ms, 2),
            "status": status,
            "metadata": metadata or {}
        }
        with self._lock:
            self.spans.appendleft(span)

    def get_spans(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self.spans)[:limit]


# Global singleton instances
metrics_tracker = MetricsTracker()
log_tracker = LogTracker()
trace_tracker = TraceTracker()

# Configure logger
logger = logging.getLogger("devpilot")
logger.setLevel(logging.INFO)
logger.addHandler(log_tracker)

# Also add stdout handler if not present
if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(console_handler)


def get_system_health() -> Dict[str, Any]:
    """Returns detailed diagnostics of the host system and DevPilot components."""
    if psutil:
        try:
            cpu_pct = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            mem_total_mb = round(mem.total / (1024 * 1024), 2)
            mem_used_mb = round(mem.used / (1024 * 1024), 2)
            mem_pct = mem.percent
            disk_total_gb = round(disk.total / (1024 ** 3), 2)
            disk_free_gb = round(disk.free / (1024 ** 3), 2)
            disk_pct = disk.percent
        except Exception:
            cpu_pct, mem_total_mb, mem_used_mb, mem_pct = 0.0, 0.0, 0.0, 0.0
            disk_total_gb, disk_free_gb, disk_pct = 0.0, 0.0, 0.0
    else:
        cpu_pct, mem_total_mb, mem_used_mb, mem_pct = 0.0, 0.0, 0.0, 0.0
        disk_total_gb, disk_free_gb, disk_pct = 0.0, 0.0, 0.0
    
    # Check LangSmith status
    langsmith_active = bool(os.getenv("LANGSMITH_TRACING") in ("true", "1", "True") and os.getenv("LANGSMITH_API_KEY"))
    
    # Check Redis status
    redis_active = False
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_timeout=1)
            redis_active = r.ping()
        except Exception:
            redis_active = False
            
    # Check FAISS index
    faiss_active = os.path.exists("faiss_index.index")
    
    return {
        "status": "HEALTHY" if cpu_pct < 95 and mem_pct < 95 else "DEGRADED",
        "timestamp": datetime.now().isoformat(),
        "system": {
            "cpu_percent": cpu_pct,
            "memory": {
                "total_mb": mem_total_mb,
                "used_mb": mem_used_mb,
                "percent": mem_pct
            },
            "disk": {
                "total_gb": disk_total_gb,
                "free_gb": disk_free_gb,
                "percent": disk_pct
            }
        },
        "components": {
            "fastapi": {"status": "ONLINE"},
            "redis_cache": {"status": "ONLINE" if redis_active else "OFFLINE / UNCONFIGURED"},
            "faiss_vector_db": {"status": "LOADED" if faiss_active else "NOT_FOUND"},
            "langsmith_tracing": {"status": "ACTIVE" if langsmith_active else "INACTIVE"},
            "log_buffer": {"buffered_entries": len(log_tracker.logs)}
        }
    }

