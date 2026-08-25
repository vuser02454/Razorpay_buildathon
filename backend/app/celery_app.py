import os
from celery import Celery
from app.core.config import settings

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

# Alias for standard Celery import conventions
celery_app = celery
