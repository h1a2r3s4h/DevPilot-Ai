import os

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    from celery import Celery
    celery_app = Celery(
        "devpilot_sandbox",
        broker=redis_url,
        backend=redis_url,
        include=["app.tasks.execution_tasks"]
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        result_expires=3600,
        task_track_started=True,
    )
except ImportError:
    # Graceful fallback mock if Celery is not installed in local environment
    class _DummyTaskResult:
        def __init__(self, result):
            self.id = "local-sync-task"
            self.status = "SUCCESS"
            self.result = result

        def get(self, timeout=None):
            return self.result

        def ready(self):
            return True

        def successful(self):
            return True

    class _DummyCelery:
        def task(self, *args, **kwargs):
            def decorator(fn):
                def delay(*fn_args, **fn_kwargs):
                    return _DummyTaskResult(fn(*fn_args, **fn_kwargs))
                fn.delay = delay
                return fn
            return decorator

    celery_app = _DummyCelery()

