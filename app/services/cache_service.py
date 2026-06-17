import os
import json
import redis

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
            return json.loads(value)
    except Exception:
        pass
    return None

def set_cache(key, value, ttl=3600):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass