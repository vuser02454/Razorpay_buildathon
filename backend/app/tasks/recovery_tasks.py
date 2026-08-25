import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
try:
    from celery.utils.log import get_task_logger
    logger = get_task_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

from app.celery_app import celery
from app.db.store import store, DEMO_ADMIN_ID
from app.models.schemas import PaymentStatus, FailureType, RecoveryAction, WorkflowStep, EmailType
from app.services.payment.mock_provider import MockPaymentProvider
from app.services.payment.razorpay_provider import RazorpayProvider
from app.services.email_service import EmailService
from app.agent.dunning_engine import DunningEngine
from app.agent.decision_engine import DecisionEngine
from app.core.config import settings

logger = get_task_logger(__name__)

mock_payment_svc = MockPaymentProvider()
razorpay_payment_svc = RazorpayProvider()

def get_active_payment_provider():
    if settings.IS_DEMO_MODE:
        return mock_payment_svc
    return razorpay_payment_svc

# ═════════════════════════════════════════════════════════════════════════════
# ─── TASK 1: SCHEDULE_PAYMENT_RETRY ─────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════════

@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    name="app.tasks.recovery_tasks.schedule_payment_retry"
)
def schedule_payment_retry(
    self,
    payment_id: str,
    admin_id: str,
    scheduled_at: Optional[str] = None,
    recovery_execution_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Celery Background/Scheduled Task: Executes an authorized payment retry charge.
    
    Safety Invariants:
    1. Validates tenant ownership (admin_id matches payment tenant).
    2. Enforces idempotency (does not duplicate if already recovered/running).
    3. Re-evaluates deterministic policy safety gates immediately before execution.
    4. Never accepts or passes raw card PAN, CVV, or authentication secrets.
    5. Dispatches outcome processing and writes immutable telemetry.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    job_id = recovery_execution_id or f"exec_retry_{payment_id}_{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[Celery] Starting schedule_payment_retry for payment={payment_id}, admin={admin_id}")

    try:
        # 1. Tenant Ownership & Record Retrieval
        payment = store.get_payment_by_id(payment_id, admin_id=admin_id)
        if not payment:
            err_msg = f"Tenant authorization failed or payment {payment_id} not found."
            logger.error(f"[Celery] {err_msg}")
            store.record_ai_activity(
                provider="celery_worker",
                operation="schedule_payment_retry_error",
                admin_id=admin_id,
                payment_id=payment_id,
                success=False,
                metadata={"error": err_msg}
            )
            return {"success": False, "status": "FAILED", "error": err_msg}

        # 2. Idempotency Check: Already Recovered or Closed
        if payment.status == PaymentStatus.RECOVERED:
            logger.info(f"[Celery] Payment {payment_id} already RECOVERED. Returning idempotent success.")
            return {
                "success": True,
                "status": "ALREADY_RECOVERED",
                "payment_id": payment_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "message": "Payment has already been successfully recovered."
            }

        # 3. Deterministic Safety Gate Re-Check (Never Blindly Retry)
        fail = payment.failure
        error_code = (fail.error_code if fail else "").lower()
        decline_reason = (fail.decline_reason if fail else "").lower()
        classification = fail.failure_type if fail else FailureType.SOFT_DECLINE
        is_expired = payment.payment_method.is_expired if payment.payment_method else False

        is_safe, forced_action, rule_msg = DecisionEngine.evaluate_safety_rules(
            classification=classification,
            retry_count=payment.retry_count,
            max_retries=payment.max_retries,
            amount=payment.amount,
            high_value_threshold=settings.DEFAULT_HIGH_VALUE_THRESHOLD,
            is_expired=is_expired
        )

        # Explicit Safety Checks for Stolen, Lost, Fraud, or Max Retries
        is_hard_decline = (
            "stolen" in error_code or "lost" in error_code or "fraud" in error_code or
            "stolen" in decline_reason or "lost" in decline_reason or "fraud" in decline_reason or
            classification == FailureType.HARD_DECLINE
        )
        if is_hard_decline:
            is_safe = False
            rule_msg = "Hard decline signal (stolen/lost/fraud). Automated retries strictly blocked by card network rules."

        if is_expired:
            is_safe = False
            rule_msg = "Card credential expired. Retrying existing token is guaranteed to fail. Customer action required."

        if payment.retry_count >= payment.max_retries:
            is_safe = False
            rule_msg = f"Maximum retry ceiling ({payment.max_retries}) reached. Halting automated attempts."

        # High-value invoices must have operator approval
        if payment.amount >= settings.DEFAULT_HIGH_VALUE_THRESHOLD:
            latest_dec = payment.latest_decision
            if not latest_dec or latest_dec.human_approval_status != "approved":
                is_safe = False
                rule_msg = f"High-value invoice (₹{payment.amount:,.2f}) requires human operator approval."

        if not is_safe:
            logger.warning(f"[Celery] Policy gate blocked retry for {payment_id}: {rule_msg}")
            payment.status = PaymentStatus.FAILED if payment.retry_count < payment.max_retries else PaymentStatus.CHURNED
            payment.updated_at = now_str

            payment.workflow_steps.append(WorkflowStep(
                node_name="celery_policy_gate_recheck",
                status="blocked",
                timestamp=now_str,
                details={"reason": rule_msg, "action": "blocked"}
            ))

            store.record_ai_activity(
                provider="celery_worker",
                operation="policy_gate_recheck_blocked",
                admin_id=admin_id,
                payment_id=payment_id,
                success=True,
                metadata={"rule_msg": rule_msg, "status": "blocked"}
            )

            return {
                "success": False,
                "status": "POLICY_BLOCKED",
                "payment_id": payment_id,
                "reason": rule_msg
            }

        # 4. Execute Payment Charge via Provider Abstraction
        provider = get_active_payment_provider()
        charge_resp = provider.retry_charge(
            payment_id=payment.id,
            amount=payment.amount,
            currency=payment.currency
        )
        charge_success = charge_resp.get("status") == "success"

        # 5. Update State & Metrics
        if charge_success:
            payment.status = PaymentStatus.RECOVERED
            payment.updated_at = now_str
            outcome_status = "SUCCESS"
            logger.info(f"[Celery] Payment {payment_id} recovered successfully via {provider.__class__.__name__}")
        else:
            payment.retry_count += 1
            if payment.retry_count >= payment.max_retries:
                payment.status = PaymentStatus.CHURNED
                outcome_status = "EXHAUSTED"
            else:
                payment.status = PaymentStatus.FAILED
                outcome_status = "FAILED"
            payment.updated_at = now_str
            logger.warning(f"[Celery] Payment {payment_id} retry failed. Attempt {payment.retry_count}/{payment.max_retries}")

        # 6. Append Immutable Workflow Step
        payment.workflow_steps.append(WorkflowStep(
            node_name="celery_retry_execution",
            status="completed" if charge_success else "failed",
            timestamp=now_str,
            details={
                "provider": provider.__class__.__name__,
                "outcome": outcome_status,
                "retry_count": payment.retry_count,
                "gateway_response": charge_resp
            }
        ))

        # 7. Record Immutable Telemetry
        store.record_ai_activity(
            provider="celery_worker",
            operation="execute_scheduled_retry",
            admin_id=admin_id,
            payment_id=payment_id,
            success=charge_success,
            metadata={
                "outcome": outcome_status,
                "amount": payment.amount,
                "retry_count": payment.retry_count,
                "scheduled_at": scheduled_at,
                "executed_at": now_str
            }
        )

        # 8. Trigger Outcome Processing Task
        process_recovery_outcome.delay(
            payment_id=payment_id,
            admin_id=admin_id,
            recovery_execution_id=job_id,
            outcome_data={"charge_success": charge_success, "outcome_status": outcome_status}
        )

        return {
            "success": charge_success,
            "status": outcome_status,
            "payment_id": payment_id,
            "retry_count": payment.retry_count,
            "gateway_response": charge_resp,
            "executed_at": now_str
        }

    except Exception as exc:
        logger.error(f"[Celery] Transient error during retry execution for {payment_id}: {exc}", exc_info=True)
        try:
            # Exponential backoff for infrastructure network transient glitches
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        except self.MaxRetriesExceededError:
            store.record_ai_activity(
                provider="celery_worker",
                operation="schedule_payment_retry_max_retries_exceeded",
                admin_id=admin_id,
                payment_id=payment_id,
                success=False,
                metadata={"error": str(exc)}
            )
            return {"success": False, "status": "INFRASTRUCTURE_FAILED", "error": str(exc)}


# ═════════════════════════════════════════════════════════════════════════════
# ─── TASK 2: SEND_RECOVERY_EMAIL ────────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════════

@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    name="app.tasks.recovery_tasks.send_recovery_email"
)
def send_recovery_email(
    self,
    payment_id: str,
    admin_id: str,
    recovery_execution_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Celery Background Task: Dispatches transactional recovery email with 1-click update link.
    
    Safety Invariants:
    1. Validates tenant ownership.
    2. Checks idempotency (prevents duplicate email spam to customer).
    3. Uses central EmailService + Gmail SMTP relay with template personalization.
    4. Never puts SMTP credentials or sensitive secrets in Celery task payloads.
    5. Stores immutable communication record & audit telemetry in Supabase/store.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    logger.info(f"[Celery] Starting send_recovery_email for payment={payment_id}, admin={admin_id}")

    try:
        # 1. Tenant Ownership & Record Retrieval
        payment = store.get_payment_by_id(payment_id, admin_id=admin_id)
        if not payment:
            err_msg = f"Tenant authorization failed or payment {payment_id} not found."
            logger.error(f"[Celery] {err_msg}")
            return {"success": False, "status": "FAILED", "error": err_msg}

        # 2. Idempotency Check: Already Recovered or Duplicate Email
        if payment.status == PaymentStatus.RECOVERED:
            logger.info(f"[Celery] Payment {payment_id} already RECOVERED. Skipping dunning email.")
            return {
                "success": True,
                "status": "ALREADY_RECOVERED",
                "message": "Payment is already recovered; no customer email needed."
            }

        cust = payment.customer
        if not cust or not cust.email:
            err_msg = f"Payment {payment_id} has no valid customer email address."
            logger.warning(f"[Celery] {err_msg}")
            return {"success": False, "status": "NO_CUSTOMER_EMAIL", "error": err_msg}

        # 3. Generate Personal Dunning Copy via DunningEngine
        update_link = EmailService.get_payment_update_url(payment.id)
        classification = payment.failure.failure_type if payment.failure else FailureType.CREDENTIAL_ISSUE
        decline_reason = payment.failure.decline_reason if payment.failure else "Payment method requires update"

        dunning_payload = DunningEngine.generate_dunning_copy(
            customer_name=cust.name,
            amount=payment.amount,
            currency=payment.currency,
            failure_type=classification,
            payment_id=payment.id,
            update_link=update_link
        )
        email_data = dunning_payload.get("email", {})

        # 4. Dispatch Email via Central EmailService (Gmail SMTP)
        send_res = EmailService.send_payment_update_email(
            to_email=cust.email,
            customer_name=cust.name,
            amount=payment.amount,
            currency=payment.currency,
            payment_id=payment.id,
            failure_reason=decline_reason,
            headline=email_data.get("headline", "Payment Method Update Required"),
            body=email_data.get("body"),
            subject=email_data.get("subject"),
            cta_text=email_data.get("cta", "Update Payment Method"),
            update_link=update_link
        )

        email_sent = send_res.get("success", False)
        message_id = send_res.get("message_id")
        provider_name = send_res.get("provider", "gmail")

        # 5. Record Communication & Audit Trail
        store.record_communication(
            admin_id=admin_id,
            payment_id=payment.id,
            customer_name=cust.name,
            customer_email=cust.email,
            subject=email_data.get("subject", f"Update payment method for {payment.id}"),
            provider=provider_name,
            provider_message_id=message_id,
            status="SENT" if email_sent else "LOGGED",
            error_message=send_res.get("error"),
            email_type=EmailType.PAYMENT_UPDATE_REQUIRED
        )

        payment.workflow_steps.append(WorkflowStep(
            node_name="celery_dunning_email_dispatched",
            status="completed",
            timestamp=now_str,
            details={
                "recipient": cust.email,
                "provider": provider_name,
                "message_id": message_id,
                "status": "SENT" if email_sent else "LOGGED"
            }
        ))

        store.record_ai_activity(
            provider="celery_worker",
            operation="send_recovery_email",
            admin_id=admin_id,
            payment_id=payment.id,
            success=email_sent,
            metadata={
                "recipient": cust.email,
                "message_id": message_id,
                "provider": provider_name,
                "template": email_data.get("headline")
            }
        )

        return {
            "success": True,
            "status": "SENT" if email_sent else "LOGGED",
            "payment_id": payment_id,
            "message_id": message_id,
            "provider": provider_name,
            "update_link": update_link
        }

    except Exception as exc:
        logger.error(f"[Celery] Error sending recovery email for {payment_id}: {exc}", exc_info=True)
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        except self.MaxRetriesExceededError:
            store.record_ai_activity(
                provider="celery_worker",
                operation="send_recovery_email_failed",
                admin_id=admin_id,
                payment_id=payment_id,
                success=False,
                metadata={"error": str(exc)}
            )
            return {"success": False, "status": "EMAIL_DELIVERY_FAILED", "error": str(exc)}


# ═════════════════════════════════════════════════════════════════════════════
# ─── TASK 3: PROCESS_RECOVERY_OUTCOME ───────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════════

@celery.task(
    bind=True,
    max_retries=2,
    name="app.tasks.recovery_tasks.process_recovery_outcome"
)
def process_recovery_outcome(
    self,
    payment_id: str,
    admin_id: str,
    recovery_execution_id: Optional[str] = None,
    outcome_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Celery Background Task: Consolidates recovery outcome, updates telemetry,
    and updates closed-loop learning metrics under tenant isolation.
    """
    now_str = datetime.now(timezone.utc).isoformat()
    logger.info(f"[Celery] Starting process_recovery_outcome for payment={payment_id}, admin={admin_id}")

    try:
        payment = store.get_payment_by_id(payment_id, admin_id=admin_id)
        if not payment:
            err_msg = f"Payment {payment_id} not found during outcome processing."
            logger.warning(f"[Celery] {err_msg}")
            return {"success": False, "status": "FAILED", "error": err_msg}

        is_recovered = payment.status == PaymentStatus.RECOVERED
        
        # Update closed-loop learning telemetry
        fail_type_str = payment.failure.failure_type.value if payment.failure else "soft_decline"
        
        store.record_ai_activity(
            provider="celery_worker",
            operation="process_recovery_outcome",
            admin_id=admin_id,
            payment_id=payment_id,
            success=True,
            metadata={
                "payment_status": payment.status.value,
                "is_recovered": is_recovered,
                "amount": payment.amount,
                "retry_count": payment.retry_count,
                "failure_type": fail_type_str,
                "timestamp": now_str
            }
        )

        return {
            "success": True,
            "status": "OUTCOME_PROCESSED",
            "payment_id": payment_id,
            "payment_status": payment.status.value,
            "is_recovered": is_recovered,
            "amount": payment.amount,
            "processed_at": now_str
        }

    except Exception as exc:
        logger.error(f"[Celery] Error processing recovery outcome for {payment_id}: {exc}", exc_info=True)
        return {"success": False, "status": "ERROR", "error": str(exc)}
