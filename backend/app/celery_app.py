import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from celery import Celery

    # Initialize Celery Application
    celery = Celery(
        "recoverai",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=["app.tasks.recovery_tasks"]
    )

    # Robust Production-Ready Configuration
    celery.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=300,        # 5 minutes hard limit
        task_soft_time_limit=240,   # 4 minutes soft limit
        result_expires=86400,       # Results expire after 24 hours in Redis
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        task_reject_on_worker_lost=True,
        task_acks_late=True,
    )
except ImportError:
    logger.warning("[Celery] Celery library not installed. Running with synchronous fallback mock.")
    
    class MockCelery:
        def task(self, *task_args, **task_kwargs):
            def decorator(fn):
                def delay(*args, **kwargs):
                    try:
                        return fn(*args, **kwargs)
                    except Exception as e:
                        logger.error(f"[MockCelery] Error executing task {fn.__name__}: {e}")
                        return {"success": False, "error": str(e)}
                fn.delay = delay
                fn.apply_async = lambda args=(), kwargs=None, **kw: delay(*(args or ()), **(kwargs or {}))
                fn.MaxRetriesExceededError = Exception
                return fn
            return decorator
            
    celery = MockCelery()

# Alias for standard Celery import conventions
celery_app = celery
