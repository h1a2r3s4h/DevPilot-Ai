import os
import redis
import json


redis_client = redis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True
)

def get_cache(key):
    value = redis_client.get(key)
    if value:
        return json.loads(value)
    return None

def set_cache(key, value, ttl=3600):
    redis_client.setex(key, ttl, json.dumps(value))