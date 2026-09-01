import os
import json
import redis
from app.core.observability import metrics_tracker

REDIS_URL = os.getenv("REDIS_URL")

# Redis optional banao - agar URL nahi hai toh crash mat karo
if REDIS_URL:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
else:
    redis_client = None

def get_cache(key):
    if not redis_client:
        return None
    try:
        value = redis_client.get(key)
        if value:
            metrics_tracker.record_cache(hit=True)
            return json.loads(value)
        else:
            metrics_tracker.record_cache(hit=False)
    except Exception:
        metrics_tracker.record_cache(hit=False)
    return None

def set_cache(key, value, ttl=3600):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass