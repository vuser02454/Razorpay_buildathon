import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.celery_app import celery, celery_app
from app.core.config import settings
from app.db.store import store, DEMO_ADMIN_ID
from app.models.schemas import (
    Payment, Customer, PaymentMethod, PaymentFailure, PaymentStatus,
    FailureType, RecoveryAction, AIDecision, DecisionFactors, RecoveryJobStatus
)
from app.tasks.recovery_tasks import (
    schedule_payment_retry,
    send_recovery_email,
    process_recovery_outcome,
)
from app.services.payment.mock_provider import MockPaymentProvider

client = TestClient(app)

# Helper function to create a test payment in store
def create_test_payment(
    admin_id: str = DEMO_ADMIN_ID,
    amount: float = 2000.0,
    failure_code: str = "insufficient_funds",
    decline_reason: str = "Low balance in customer account",
    failure_type: FailureType = FailureType.SOFT_DECLINE,
    is_expired: bool = False,
    retry_count: int = 0,
    max_retries: int = 3,
    status: PaymentStatus = PaymentStatus.FAILED,
    requires_human_review: bool = False,
    human_approval_status: str = "not_required"
) -> Payment:
    pid = f"pay_test_{uuid.uuid4().hex[:8]}"
    cust_id = f"cust_test_{uuid.uuid4().hex[:6]}"
    
    cust = Customer(
        id=cust_id,
        name="Ananya Iyer",
        email="ananya.iyer@example.in",
        country="IN",
        lifetime_value=24000.0,
        tenure_months=8,
        historical_success_rate=0.92
    )
    pm = PaymentMethod(
        id=f"pm_test_{uuid.uuid4().hex[:6]}",
        card_brand="Visa",
        last4="4242",
        exp_month=12,
        exp_year=2028,
        is_expired=is_expired
    )
    fail = PaymentFailure(
        id=f"fail_test_{uuid.uuid4().hex[:6]}",
        payment_id=pid,
        error_code=failure_code,
        decline_reason=decline_reason,
        failure_type=failure_type,
        bank_name="HDFC Bank",
        is_retryable=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    decision = AIDecision(
        id=f"dec_test_{uuid.uuid4().hex[:6]}",
        payment_id=pid,
        classification=failure_type,
        recommended_action=RecoveryAction.RETRY,
        recovery_probability=0.78,
        confidence=0.85,
        recommended_retry_time="09:30 AM",
        explanation="High probability soft decline eligible for scheduled retry.",
        decision_factors=DecisionFactors(
            failure_type=failure_type.value,
            historical_success_rate=0.92,
            previous_attempts_count=retry_count,
            customer_tenure_months=8,
            amount_risk_tier="low",
            bank_health_score=0.94,
            optimal_time_slot="09:30 AM",
            network_retry_safe=True
        ),
        requires_human_review=requires_human_review,
        human_approval_status=human_approval_status,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    p = Payment(
        id=pid,
        customer_id=cust_id,
        customer=cust,
        payment_method=pm,
        amount=amount,
        currency="INR",
        status=status,
        failure=fail,
        latest_decision=decision,
        retry_count=retry_count,
        max_retries=max_retries,
        workflow_steps=[],
        source="TEST",
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    
    store.payments[pid] = p
    store.payment_admin_map[pid] = admin_id
    store.customers[cust_id] = cust
    return p


# ─── 1. CELERY CONFIGURATION & INITIALIZATION TESTS ─────────────────────────

def test_celery_app_initialization():
    """Verify Celery app loads with proper Redis broker and JSON serialization."""
    assert celery is not None
    assert celery_app is not None
    assert celery.main == "recoverai"
    assert celery.conf.task_serializer == "json"
    assert celery.conf.result_serializer == "json"
    assert celery.conf.accept_content == ["json"]
    assert celery.conf.timezone == "UTC"
    assert celery.conf.enable_utc is True
    assert celery.conf.task_track_started is True
    assert celery.conf.task_time_limit == 300
    assert celery.conf.task_soft_time_limit == 240


def test_celery_tasks_registered():
    """Verify all 3 recovery automation tasks are registered in Celery."""
    registered = celery.tasks
    assert "app.tasks.recovery_tasks.schedule_payment_retry" in registered
    assert "app.tasks.recovery_tasks.send_recovery_email" in registered
    assert "app.tasks.recovery_tasks.process_recovery_outcome" in registered


# ─── 2. RECOVERY TASK EXECUTION & SAFETY GATES ──────────────────────────────

def test_schedule_payment_retry_success():
    """Verify schedule_payment_retry task recovers eligible soft decline payment."""
    p = create_test_payment(amount=1500.0, retry_count=0)
    
    # Run Celery task directly
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID,
        scheduled_at="09:30 AM"
    )
    
    assert res["success"] is True
    assert res["status"] == "SUCCESS"
    assert p.status == PaymentStatus.RECOVERED


def test_schedule_payment_retry_tenant_isolation():
    """Verify a tenant cannot trigger retry for another merchant's payment."""
    p = create_test_payment(admin_id=DEMO_ADMIN_ID)
    
    # Attempt execution with unauthorized admin_id
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id="admin_unauthorized_999",
        scheduled_at="09:30 AM"
    )
    
    assert res["success"] is False
    assert res["status"] == "FAILED"
    assert "authorization failed" in res["error"].lower()


def test_schedule_payment_retry_blocks_stolen_fraud():
    """Verify deterministic safety gate prevents Celery from retrying stolen/fraud card."""
    p = create_test_payment(
        failure_code="stolen_card",
        decline_reason="Card reported stolen / fraudulent",
        failure_type=FailureType.HARD_DECLINE
    )
    
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is False
    assert res["status"] == "POLICY_BLOCKED"
    assert "hard decline" in res["reason"].lower() or "blocked" in res["reason"].lower()
    assert p.status != PaymentStatus.RECOVERED


def test_schedule_payment_retry_blocks_expired_card():
    """Verify deterministic safety gate prevents Celery from retrying expired card."""
    p = create_test_payment(
        failure_code="expired_card",
        decline_reason="Card validity expired",
        failure_type=FailureType.CREDENTIAL_ISSUE,
        is_expired=True
    )
    
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is False
    assert res["status"] == "POLICY_BLOCKED"
    assert "expired" in res["reason"].lower()
    assert p.status != PaymentStatus.RECOVERED


def test_schedule_payment_retry_blocks_max_retries_exceeded():
    """Verify deterministic safety gate blocks retries when limit reached."""
    p = create_test_payment(
        retry_count=3,
        max_retries=3
    )
    
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is False
    assert res["status"] == "POLICY_BLOCKED"
    assert "maximum retry ceiling" in res["reason"].lower() or "blocked" in res["reason"].lower()


def test_schedule_payment_retry_blocks_unapproved_high_value():
    """Verify invoices >= 10,000 without human approval are blocked by policy gate."""
    p = create_test_payment(
        amount=15000.0,
        requires_human_review=True,
        human_approval_status="pending"
    )
    
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is False
    assert res["status"] == "POLICY_BLOCKED"
    assert "human operator approval" in res["reason"].lower()


def test_schedule_payment_retry_idempotency():
    """Verify Celery does not re-charge an already recovered payment."""
    p = create_test_payment(status=PaymentStatus.RECOVERED)
    
    res = schedule_payment_retry(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is True
    assert res["status"] == "ALREADY_RECOVERED"


def test_send_recovery_email_task():
    """Verify send_recovery_email generates personalized copy and logs communication."""
    p = create_test_payment(
        failure_code="card_expired",
        decline_reason="Card expired, please update",
        failure_type=FailureType.CREDENTIAL_ISSUE,
        is_expired=True
    )
    
    res = send_recovery_email(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is True
    assert res["status"] in ["SENT", "LOGGED"]
    assert res["update_link"] is not None
    assert "share.google" in res["update_link"] or p.id in res["update_link"]


def test_send_recovery_email_idempotency_already_recovered():
    """Verify send_recovery_email skips sending emails if payment is already recovered."""
    p = create_test_payment(status=PaymentStatus.RECOVERED)
    
    res = send_recovery_email(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID
    )
    
    assert res["success"] is True
    assert res["status"] == "ALREADY_RECOVERED"


def test_process_recovery_outcome_task():
    """Verify process_recovery_outcome updates telemetry and metrics."""
    p = create_test_payment(status=PaymentStatus.RECOVERED)
    
    res = process_recovery_outcome(
        payment_id=p.id,
        admin_id=DEMO_ADMIN_ID,
        outcome_data={"charge_success": True}
    )
    
    assert res["success"] is True
    assert res["status"] == "OUTCOME_PROCESSED"
    assert res["is_recovered"] is True


# ─── 3. FASTAPI API & HEALTH CHECK ENDPOINTS ─────────────────────────────────

def test_health_endpoints():
    """Verify Celery and Redis health endpoints return operational status."""
    res_celery = client.get("/api/health/celery")
    assert res_celery.status_code == 200
    data_celery = res_celery.json()
    assert data_celery["provider"] == "Celery Worker"
    assert data_celery["status"] == "operational"

    res_redis = client.get("/api/health/redis")
    assert res_redis.status_code == 200
    data_redis = res_redis.json()
    assert data_redis["provider"] == "Redis Broker"
    assert data_redis["status"] in ["operational", "standby"]

    res_sys = client.get("/api/system/status")
    assert res_sys.status_code == 200
    sys_data = res_sys.json()
    assert "celery" in sys_data
    assert "redis" in sys_data
    assert sys_data["celery"]["status"] == "operational"


def test_schedule_retry_api_endpoint():
    """Verify POST /api/recovery/schedule-retry endpoint with mock token."""
    p = create_test_payment()
    
    # Provide demo admin token/headers
    headers = {"Authorization": "Bearer mock_token_demo"}
    res = client.post(
        "/api/recovery/schedule-retry",
        json={"payment_id": p.id, "scheduled_at": "10:00 AM"},
        headers=headers
    )
    
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "job" in data
    assert data["job"]["task_type"] == "schedule_payment_retry"


def test_schedule_email_api_endpoint():
    """Verify POST /api/recovery/schedule-email endpoint."""
    p = create_test_payment()
    headers = {"Authorization": "Bearer mock_token_demo"}
    
    res = client.post(
        "/api/recovery/schedule-email",
        json={"payment_id": p.id},
        headers=headers
    )
    
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["job"]["task_type"] == "send_recovery_email"


def test_get_recovery_jobs_endpoints():
    """Verify GET /api/recovery/jobs and GET /api/recovery/jobs/{job_id}."""
    p = create_test_payment()
    headers = {"Authorization": "Bearer mock_token_demo"}
    
    # Schedule a job first
    sched_res = client.post(
        "/api/recovery/schedule-retry",
        json={"payment_id": p.id, "scheduled_at": "09:30 AM"},
        headers=headers
    )
    job_id = sched_res.json()["job"]["id"]
    
    # Retrieve job by ID
    job_res = client.get(f"/api/recovery/jobs/{job_id}", headers=headers)
    assert job_res.status_code == 200
    assert job_res.json()["job"]["id"] == job_id
    
    # List jobs
    list_res = client.get("/api/recovery/jobs", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1
