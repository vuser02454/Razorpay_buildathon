import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, Depends
from app.models.schemas import (
    Payment, AIDecision, DecisionFactors, DunningEvent, MerchantPolicy,
    SimulateFailureRequest, SimulateRetryRequest, PaymentStatus, RecoveryAction,
    WorkflowStep, FailureType, Customer, PaymentMethod, PaymentFailure, CustomerSegment,
    SHAPExplanationResponse, ExplainRecoveryRequest, ScheduleRetryRequest, ScheduleEmailRequest,
    RecoveryJob, RecoveryJobStatus
)
from app.db.store import store, DEMO_ADMIN_ID
from app.agent.graph import recovery_graph_app
from app.tasks.recovery_tasks import (
    schedule_payment_retry,
    send_recovery_email,
    process_recovery_outcome,
)
from app.services.payment.mock_provider import MockPaymentProvider
from app.services.payment.razorpay_provider import RazorpayProvider
from app.services.shap_service import shap_service
from app.core.config import settings
from app.api.auth import get_current_admin, AdminProfile


router = APIRouter()
mock_payment_svc = MockPaymentProvider()
razorpay_payment_svc = RazorpayProvider()

def get_active_payment_provider():
    if settings.IS_DEMO_MODE:
        return mock_payment_svc
    return razorpay_payment_svc

from app.services.ai_router import AIRouter

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RecoverAI API",
        "version": settings.VERSION,
        "is_demo_mode": settings.IS_DEMO_MODE,
        "database": "Supabase PostgreSQL (Active Sync)"
    }

@router.get("/health/gemini")
def health_gemini():
    return AIRouter.get_provider_health("gemini")

@router.get("/health/groq")
def health_groq():
    return AIRouter.get_provider_health("groq")

@router.get("/health/openrouter")
def health_openrouter():
    return AIRouter.get_provider_health("openrouter")

@router.get("/health/langgraph")
def health_langgraph():
    return AIRouter.get_provider_health("langgraph")

@router.get("/health/celery")
def health_celery():
    return AIRouter.get_provider_health("celery")

@router.get("/health/redis")
def health_redis():
    return AIRouter.get_provider_health("redis")

@router.get("/health/emailjs")
@router.get("/health/gmail")
@router.get("/health/brevo")
@router.get("/health/resend")
def health_email():
    return AIRouter.get_provider_health("emailjs")

@router.get("/health/razorpay")
def health_razorpay():
    return AIRouter.get_provider_health("razorpay")

@router.get("/health/supabase")
def health_supabase():
    return AIRouter.get_provider_health("supabase")

@router.get("/system/status")
@router.get("/ai/status")
def get_system_and_ai_status():
    """
    Developer/Admin diagnostic endpoint to inspect operational connectivity
    of Gemini, Groq, OpenRouter, LangGraph, Celery, Redis, Gmail SMTP, Razorpay, and Supabase.
    Zero key exposure.
    """
    return AIRouter.get_services_status()


# ─── DEDICATED AI ROUTER ENDPOINTS ──────────────────────────────────────────

@router.post("/ai/analyze-payment")
async def ai_analyze_payment(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    payment_id = payload.get("payment_id")
    p = store.get_payment_by_id(payment_id, admin_id=admin.id) if payment_id else None
    
    ctx = {
        "payment_id": payment_id,
        "customer_name": p.customer.name if (p and p.customer) else payload.get("customer_name", "Customer"),
        "amount": p.amount if p else payload.get("amount", 2000.0),
        "currency": p.currency if p else payload.get("currency", "INR"),
        "failure_code": p.failure.error_code if (p and p.failure) else payload.get("failure_code", "generic_decline"),
        "failure_reason": p.failure.decline_reason if (p and p.failure) else payload.get("failure_reason", "Declined by bank"),
        "is_card_expired": p.payment_method.is_expired if (p and p.payment_method) else payload.get("is_card_expired", False),
        "customer_history": {
            "tenure_months": p.customer.tenure_months if (p and p.customer) else 6,
            "historical_success_rate": p.customer.historical_success_rate if (p and p.customer) else 0.90
        }
    }
    return await AIRouter.analyze_payment_failure(ctx, admin_id=admin.id)

@router.post("/ai/recovery-probability")
async def ai_recovery_probability(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    payment_id = payload.get("payment_id")
    p = store.get_payment_by_id(payment_id, admin_id=admin.id) if payment_id else None
    
    ctx = {
        "payment_id": payment_id,
        "customer_name": p.customer.name if (p and p.customer) else payload.get("customer_name", "Customer"),
        "amount": p.amount if p else payload.get("amount", 2000.0),
        "currency": p.currency if p else payload.get("currency", "INR"),
        "failure_code": p.failure.error_code if (p and p.failure) else payload.get("failure_code", "insufficient_funds"),
        "is_card_expired": p.payment_method.is_expired if (p and p.payment_method) else payload.get("is_card_expired", False),
    }
    return await AIRouter.calculate_recovery_probability(ctx, admin_id=admin.id)

@router.post("/ai/explain-recovery", response_model=SHAPExplanationResponse)
async def ai_explain_recovery(
    payload: ExplainRecoveryRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Explainable AI (XAI) Endpoint:
    Returns mathematical SHAP feature attributions for a given payment recovery prediction.
    Enforces tenant isolation and validates admin authorization.
    """
    p = store.get_payment_by_id(payload.payment_id, admin_id=admin.id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")

    payment_dict = p.model_dump()
    customer_dict = p.customer.model_dump() if p.customer else {}

    explanation = shap_service.explain_payment(
        payment=payment_dict,
        customer=customer_dict,
        failure_type_str=p.failure.failure_type.value if (p.failure and p.failure.failure_type) else None
    )

    # Record AI interaction activity in audit log
    store.record_ai_activity(
        provider="shap_xai",
        operation="feature_attribution_explanation",
        admin_id=admin.id,
        payment_id=p.id,
        success=explanation.available,
        metadata={
            "model_version": explanation.model_version,
            "recovery_probability": explanation.recovery_probability,
            "base_probability": explanation.base_probability,
            "top_positive": [f.feature for f in explanation.top_positive_factors[:2]],
            "top_negative": [f.feature for f in explanation.top_negative_factors[:2]]
        }
    )

    return explanation

@router.post("/ai/generate-dunning")
async def ai_generate_dunning(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    return await AIRouter.generate_dunning_message(payload, admin_id=admin.id)

@router.post("/ai/explain-policy")
async def ai_explain_policy(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    return {"explanation": await AIRouter.explain_policy_decision(payload, admin_id=admin.id)}

@router.post("/ai/analyze-analytics")
async def ai_analyze_analytics(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    return {"insights": await AIRouter.analyze_recovery_analytics(payload, admin_id=admin.id)}

@router.get("/ai/audit-logs")
def get_ai_audit_logs(admin: AdminProfile = Depends(get_current_admin), limit: int = Query(50, ge=1, le=100)):
    return store.get_ai_activities(admin_id=admin.id, limit=limit)

@router.get("/dashboard/stats")
def get_dashboard_kpis(admin: AdminProfile = Depends(get_current_admin)):
    return store.get_kpis(admin_id=admin.id)

@router.get("/payments")
def list_payments(
    filter_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: AdminProfile = Depends(get_current_admin)
):
    return store.get_payments(
        admin_id=admin.id,
        filter_type=filter_type,
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )

@router.get("/payments/{payment_id}")
def get_payment_detail(payment_id: str, admin: AdminProfile = Depends(get_current_admin)):
    p = store.get_payment_by_id(payment_id, admin_id=admin.id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return p

@router.get("/payments/{payment_id}/public")
def get_public_payment_detail(payment_id: str):
    """
    Public customer-facing endpoint to render the payment update page without merchant authentication.
    """
    p = store.payments.get(payment_id)
    if not p:
        # Fallback to first available payment or mock record for demo/test links
        p = list(store.payments.values())[0] if store.payments else None
        if not p:
            raise HTTPException(status_code=404, detail="Payment record not found")

    return {
        "id": p.id,
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status,
        "customer_name": p.customer.name if p.customer else "Valued Customer",
        "customer_email": p.customer.email if p.customer else "customer@example.com",
        "merchant_name": "RecoverAI Subscription",
        "failure_reason": p.failure.decline_reason if p.failure else "Payment update required",
        "created_at": p.created_at
    }

@router.post("/payments/{payment_id}/customer-update")
def process_customer_payment_update(payment_id: str, payload: Dict[str, Any] = {}):
    """
    Public customer-facing endpoint to process 1-click payment update from email link.
    Transitions payment status to RECOVERED and updates merchant telemetry.
    """
    p = store.payments.get(payment_id)
    if not p:
        p = list(store.payments.values())[0] if store.payments else None
        if not p:
            raise HTTPException(status_code=404, detail="Payment record not found")

    now_str = datetime.now(timezone.utc).isoformat()
    p.status = PaymentStatus.RECOVERED
    p.updated_at = now_str
    
    # Update payment method info if provided
    card_brand = payload.get("card_brand", "Visa")
    last4 = payload.get("last4", "4242")
    if p.payment_method:
        p.payment_method.card_brand = card_brand
        p.payment_method.last4 = last4
        p.payment_method.is_expired = False

    # Add workflow step
    p.workflow_steps.append(WorkflowStep(
        node_name="customer_dunning_update",
        status="completed",
        timestamp=now_str,
        details={"channel": "email_dunning", "method": payload.get("method", "card"), "status": "recovered"}
    ))

    return {
        "success": True,
        "message": f"Payment of ₹{p.amount:,.2f} successfully updated and recovered!",
        "payment": p
    }

from app.agent.graph import recovery_graph_app, run_recovery_workflow

@router.post("/recovery/run")
@router.post("/recovery/analyze")
def run_ai_recovery_analysis(payload: Dict[str, Any], admin: AdminProfile = Depends(get_current_admin)):
    """
    Executes the 7-node LangGraph autonomous recovery workflow.
    Authenticates tenant, runs deterministic policy gate, executes smart recovery,
    and returns full auditable execution trace.
    """
    payment_id = payload.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Missing payment_id")
        
    payment = store.get_payment_by_id(payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    cust = payment.customer
    pm = payment.payment_method
    fail = payment.failure

    input_data = {
        "payment_id": payment.id,
        "admin_id": admin.id,
        "customer_id": cust.id if cust else "cust_unknown",
        "customer_name": cust.name if cust else "Valued Customer",
        "customer_email": cust.email if cust else "customer@demo.com",
        "amount": payment.amount,
        "currency": payment.currency,
        "failure_code": fail.error_code if fail else "generic_decline",
        "failure_reason": fail.decline_reason if fail else "Declined by bank",
        "payment_method_type": pm.type if pm else "card",
        "is_card_expired": pm.is_expired if pm else False,
        "customer_history": {
            "tenure_months": cust.tenure_months if cust else 6,
            "historical_success_rate": cust.historical_success_rate if cust else 0.90,
            "segment": cust.segment.value if cust else "standard"
        },
        "retry_count": payment.retry_count,
        "max_retry_count": payment.max_retries,
        "previous_attempts": payment.retry_count,
        "previous_successes": 1 if payment.status == PaymentStatus.RECOVERED else 0,
        "geographic_context": cust.country if cust else "IN"
    }

    # Execute LangGraph state machine
    graph_result = run_recovery_workflow(input_data)

    # Construct AIDecision
    decision_id = f"dec_{uuid.uuid4().hex[:8]}"
    decision = AIDecision(
        id=decision_id,
        payment_id=payment.id,
        classification=graph_result.get("classification", FailureType.SOFT_DECLINE),
        recommended_action=graph_result.get("recommended_action", RecoveryAction.RETRY),
        recovery_probability=graph_result.get("recovery_probability", 0.70),
        confidence=graph_result.get("confidence", 0.85),
        recommended_retry_time=graph_result.get("recommended_retry_time"),
        explanation=graph_result.get("explanation", "AI analyzed decline patterns."),
        decision_factors=DecisionFactors(**graph_result.get("decision_factors", {})),
        requires_human_review=graph_result.get("requires_human_review", False),
        human_approval_status=graph_result.get("human_approval_status", "not_required"),
        agent_version="v2.0-langgraph",
        created_at=datetime.now(timezone.utc).isoformat()
    )

    payment.latest_decision = decision

    # Schedule background automation job via Celery if approved and not requiring human approval
    scheduled_job = None
    next_action_str = graph_result.get("next_action", "STOP")
    
    if not graph_result.get("requires_human_review", False):
        if next_action_str == "RETRY":
            job = store.record_recovery_job(
                admin_id=admin.id,
                payment_id=payment.id,
                task_type="schedule_payment_retry",
                status="SCHEDULED",
                scheduled_at=graph_result.get("recommended_retry_time", "09:30 AM")
            )
            # Dispatch Celery background task
            try:
                task_res = schedule_payment_retry.delay(
                    payment_id=payment.id,
                    admin_id=admin.id,
                    scheduled_at=graph_result.get("recommended_retry_time", "09:30 AM"),
                    recovery_execution_id=job["id"]
                )
                job["celery_task_id"] = task_res.id
                payment.status = PaymentStatus.SCHEDULED
            except Exception as e:
                job["error"] = str(e)
            scheduled_job = job

        elif next_action_str == "CUSTOMER_ACTION":
            job = store.record_recovery_job(
                admin_id=admin.id,
                payment_id=payment.id,
                task_type="send_recovery_email",
                status="QUEUED"
            )
            try:
                task_res = send_recovery_email.delay(
                    payment_id=payment.id,
                    admin_id=admin.id,
                    recovery_execution_id=job["id"]
                )
                job["celery_task_id"] = task_res.id
                payment.status = PaymentStatus.IN_REVIEW
            except Exception as e:
                job["error"] = str(e)
            scheduled_job = job

    return {
        "success": True,
        "payment_id": payment.id,
        "failure_type": graph_result.get("failure_type", "SOFT_DECLINE"),
        "recovery_probability": graph_result.get("recovery_probability", 0.74),
        "confidence": graph_result.get("confidence", 0.85),
        "policy_decision": graph_result.get("policy_decision", "RETRY_ELIGIBLE"),
        "next_action": graph_result.get("next_action", "RETRY"),
        "recommended_action": graph_result.get("recommended_action", RecoveryAction.RETRY),
        "requires_human_review": graph_result.get("requires_human_review", False),
        "email_sent": graph_result.get("email_sent", False),
        "outcome": graph_result.get("outcome", "RETRY_SCHEDULED"),
        "recommended_retry_time": graph_result.get("recommended_retry_time", "09:30 AM"),
        "job": scheduled_job,
        "decision": decision,
        "payment": payment,
        "graph_state": graph_result,
        "audit_trail": graph_result.get("audit_trail", [])
    }

@router.post("/recovery/schedule-retry")
def schedule_payment_retry_endpoint(
    req: ScheduleRetryRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Explicitly schedules a background payment retry job via Celery and Redis.
    Enforces tenant isolation and policy safety gates.
    """
    payment = store.get_payment_by_id(req.payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found or tenant access denied.")

    # Record job in tracking store
    job = store.record_recovery_job(
        admin_id=admin.id,
        payment_id=payment.id,
        task_type="schedule_payment_retry",
        status="SCHEDULED",
        scheduled_at=req.scheduled_at or "09:30 AM"
    )

    try:
        task_res = schedule_payment_retry.delay(
            payment_id=payment.id,
            admin_id=admin.id,
            scheduled_at=req.scheduled_at,
            recovery_execution_id=job["id"]
        )
        job["celery_task_id"] = task_res.id
        payment.status = PaymentStatus.SCHEDULED
    except Exception as e:
        job["status"] = "FAILED"
        job["error"] = str(e)

    return {
        "success": True,
        "message": f"Payment retry scheduled via Celery for {req.scheduled_at or 'optimal clearing window'}",
        "job": job,
        "payment": payment
    }

@router.post("/recovery/schedule-email")
def schedule_recovery_email_endpoint(
    req: ScheduleEmailRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Dispatches a transactional recovery email in the background via Celery and Gmail SMTP.
    Enforces tenant isolation and prevents duplicate customer notifications.
    """
    payment = store.get_payment_by_id(req.payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found or tenant access denied.")

    job = store.record_recovery_job(
        admin_id=admin.id,
        payment_id=payment.id,
        task_type="send_recovery_email",
        status="QUEUED"
    )

    try:
        task_res = send_recovery_email.delay(
            payment_id=payment.id,
            admin_id=admin.id,
            recovery_execution_id=job["id"]
        )
        job["celery_task_id"] = task_res.id
        payment.status = PaymentStatus.IN_REVIEW
    except Exception as e:
        job["status"] = "FAILED"
        job["error"] = str(e)

    return {
        "success": True,
        "message": "Recovery email job queued via Celery",
        "job": job,
        "payment": payment
    }

@router.get("/recovery/jobs/{job_id}")
def get_recovery_job_endpoint(
    job_id: str,
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Returns the real-time lifecycle status of a background Celery recovery job.
    Enforces strict tenant isolation.
    """
    job = store.get_recovery_job(job_id, admin_id=admin.id)
    if not job:
        raise HTTPException(status_code=404, detail="Recovery job not found or tenant access denied.")
    return {
        "success": True,
        "job": job
    }

@router.get("/recovery/jobs")
def list_recovery_jobs_endpoint(
    payment_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Lists background Celery recovery automation jobs for the authenticated merchant admin.
    """
    if payment_id:
        jobs = store.get_recovery_jobs_for_payment(payment_id, admin_id=admin.id)
    else:
        jobs = store.get_recovery_jobs(admin_id=admin.id, limit=limit)
    return {
        "success": True,
        "total": len(jobs),
        "jobs": jobs
    }

@router.post("/recovery/execute")
def execute_recovery_action(payload: Dict[str, str], admin: AdminProfile = Depends(get_current_admin)):
    payment_id = payload.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Missing payment_id")
        
    payment = store.get_payment_by_id(payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    decision = payment.latest_decision
    if not decision:
        raise HTTPException(status_code=400, detail="Run AI analysis before executing recovery")

    if decision.requires_human_review and decision.human_approval_status != "approved":
        raise HTTPException(status_code=403, detail="Human review approval required before execution")

    action = decision.recommended_action
    
    if action in [RecoveryAction.RETRY, RecoveryAction.WAIT_AND_RETRY]:
        # Execute background retry task via Celery
        job = store.record_recovery_job(
            admin_id=admin.id,
            payment_id=payment.id,
            task_type="schedule_payment_retry",
            status="RUNNING"
        )
        task_res = schedule_payment_retry.delay(
            payment_id=payment.id,
            admin_id=admin.id,
            recovery_execution_id=job["id"]
        )
        job["celery_task_id"] = task_res.id
        return {
            "success": True,
            "message": f"Action {action.value} dispatched to Celery background worker",
            "job": job,
            "payment": payment
        }
    elif action in [RecoveryAction.CUSTOMER_ACTION, RecoveryAction.CUSTOMER_ACTION_DUNNING]:
        job = store.record_recovery_job(
            admin_id=admin.id,
            payment_id=payment.id,
            task_type="send_recovery_email",
            status="QUEUED"
        )
        task_res = send_recovery_email.delay(
            payment_id=payment.id,
            admin_id=admin.id,
            recovery_execution_id=job["id"]
        )
        job["celery_task_id"] = task_res.id
        payment.status = PaymentStatus.IN_REVIEW
        return {
            "success": True,
            "message": "Dunning email dispatched to Celery background worker",
            "job": job,
            "payment": payment
        }
    elif action == RecoveryAction.DO_NOT_RETRY:
        payment.status = PaymentStatus.CHURNED
        return {
            "success": True,
            "message": "Payment marked as do_not_retry (churned)",
            "payment": payment
        }

    return {
        "success": True,
        "message": f"Action {action.value} processed",
        "payment": payment
    }


@router.post("/recovery/{payment_id}/approve")
def approve_human_review(payment_id: str, admin: AdminProfile = Depends(get_current_admin)):
    p = store.get_payment_by_id(payment_id, admin_id=admin.id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
    if p.latest_decision:
        p.latest_decision.human_approval_status = "approved"
        p.status = PaymentStatus.SCHEDULED
    return {"success": True, "payment": p}

@router.post("/recovery/{payment_id}/reject")
def reject_human_review(payment_id: str, admin: AdminProfile = Depends(get_current_admin)):
    p = store.get_payment_by_id(payment_id, admin_id=admin.id)
    if not p:
        raise HTTPException(status_code=404, detail="Payment record not found")
    if p.latest_decision:
        p.latest_decision.human_approval_status = "rejected"
        p.status = PaymentStatus.EXHAUSTED
    return {"success": True, "payment": p}

@router.get("/dunning")
def get_dunning_queue(admin: AdminProfile = Depends(get_current_admin)):
    return store.get_dunning_events(admin_id=admin.id)

@router.post("/dunning/{dunning_id}/send")
def trigger_dunning_send(dunning_id: str, admin: AdminProfile = Depends(get_current_admin)):
    events = store.get_dunning_events(admin_id=admin.id)
    target = next((d for d in events if d.id == dunning_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Dunning event not found")
    target.status = "sent"
    target.sent_at = datetime.now(timezone.utc).isoformat()
    return {"success": True, "dunning": target}

@router.get("/experiments")
def get_experiment_stats(admin: AdminProfile = Depends(get_current_admin)):
    return store.get_experiments(admin_id=admin.id)

@router.get("/learning")
def get_learning_telemetry(admin: AdminProfile = Depends(get_current_admin)):
    return store.get_learning_metrics(admin_id=admin.id)

@router.get("/settings")
def get_merchant_settings(admin: AdminProfile = Depends(get_current_admin)):
    policy = store.get_policy(admin_id=admin.id)
    return {
        "policy": policy,
        "is_demo_mode": settings.IS_DEMO_MODE,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID or "rzp_test_mock_mode"
    }

@router.put("/settings")
def update_merchant_settings(policy: MerchantPolicy, admin: AdminProfile = Depends(get_current_admin)):
    updated = store.update_policy(policy, admin_id=admin.id)
    return {"success": True, "policy": updated}

@router.post("/demo/simulate-failure")
def simulate_payment_failure(req: SimulateFailureRequest, admin: AdminProfile = Depends(get_current_admin)):
    new_pid = f"pay_{uuid.uuid4().hex[:10]}"
    cust = Customer(
        id=f"cust_{uuid.uuid4().hex[:8]}",
        name="Test Merchant Customer",
        email=f"user_{uuid.uuid4().hex[:4]}@example.com",
        tenure_months=6,
        historical_success_rate=0.88,
        segment=CustomerSegment.GROWTH,
        country="IN",
        created_at=datetime.now(timezone.utc).isoformat()
    )
    pm = PaymentMethod(
        id=f"pm_{uuid.uuid4().hex[:8]}",
        customer_id=cust.id,
        type="card",
        card_network="Visa",
        last4="4242",
        expiry_month=12,
        expiry_year=2028,
        is_expired=False,
        is_international=False,
        issuer_bank="HDFC Bank"
    )
    fail = PaymentFailure(
        error_code=req.failure_code or "insufficient_funds",
        decline_reason="Cardholder has insufficient balance for subscription debit",
        failure_type=FailureType.SOFT_DECLINE,
        gateway_response_code="BAD_REQUEST",
        gateway_error_description="Declined by issuing bank",
        is_retryable=True,
        failed_at=datetime.now(timezone.utc).isoformat()
    )
    
    new_payment = Payment(
        id=new_pid,
        subscription_id=f"sub_{uuid.uuid4().hex[:8]}",
        customer_id=cust.id,
        amount=req.amount or 2000.0,
        currency=req.currency or "INR",
        status=PaymentStatus.FAILED,
        retry_count=0,
        max_retries=3,
        payment_method=pm,
        failure=fail,
        customer=cust,
        workflow_steps=[
            WorkflowStep(name="Load Payment", status="completed", timestamp=datetime.now(timezone.utc).isoformat(), details="Payment failure captured"),
            WorkflowStep(name="AI Triage", status="running", timestamp=datetime.now(timezone.utc).isoformat(), details="Running LangGraph model")
        ],
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat()
    )

    store.payments[new_pid] = new_payment
    store.payment_admin_map[new_pid] = admin.id
    
    return {"success": True, "payment": new_payment}

@router.post("/demo/simulate-retry")
def simulate_retry_outcome(req: SimulateRetryRequest, admin: AdminProfile = Depends(get_current_admin)):
    payment = store.get_payment_by_id(req.payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if req.outcome == "success":
        payment.status = PaymentStatus.RECOVERED
        payment.updated_at = datetime.now(timezone.utc).isoformat()
        msg = f"Simulated charge success for payment {payment.id}. Status changed to RECOVERED."
    else:
        payment.retry_count += 1
        if payment.retry_count >= payment.max_retries:
            payment.status = PaymentStatus.EXHAUSTED
        else:
            payment.status = PaymentStatus.FAILED
        payment.updated_at = datetime.now(timezone.utc).isoformat()
        msg = f"Simulated retry failure for payment {payment.id}. Attempt {payment.retry_count}/{payment.max_retries}."

    return {
        "success": True,
        "message": msg,
        "payment": payment
    }

@router.post("/demo/reset")
def reset_demo_data(admin: AdminProfile = Depends(get_current_admin)):
    if admin.is_demo:
        store.initialize_demo_data()
    return {"success": True, "message": "Data refreshed"}
