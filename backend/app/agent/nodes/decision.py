from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.decision_engine import DecisionEngine
from app.models.schemas import FailureType, RecoveryAction
from app.core.config import settings

def decision_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 4: Decision Node.
    Synthesizes failure classification, ML probability score, and deterministic policy
    into a definitive next workflow action: RETRY, CUSTOMER_ACTION, HUMAN_REVIEW, or STOP.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    forced_action = state.get("recommended_action")
    amount = float(state.get("amount", 2000.0))
    prob = float(state.get("recovery_probability", 0.5))
    confidence = float(state.get("confidence", 0.85))
    classification = state.get("classification")
    history = state.get("customer_history", {})
    tenure = int(history.get("tenure_months", 6))

    requires_human = False
    email_required = False

    if forced_action:
        action = forced_action
    else:
        # High value invoices requiring human approval
        if amount >= settings.DEFAULT_HIGH_VALUE_THRESHOLD:
            action = RecoveryAction.HUMAN_REVIEW
            requires_human = True
        elif classification == FailureType.NETWORK_TIMEOUT:
            action = RecoveryAction.RETRY
        elif classification == FailureType.SOFT_DECLINE:
            action = RecoveryAction.RETRY if prob >= 0.40 else RecoveryAction.CUSTOMER_ACTION
        else:
            action = RecoveryAction.CUSTOMER_ACTION

    # Map to next_action string for routing
    if action in [RecoveryAction.RETRY, RecoveryAction.WAIT_AND_RETRY]:
        next_action_str = "RETRY"
    elif action == RecoveryAction.CUSTOMER_ACTION:
        next_action_str = "CUSTOMER_ACTION"
        email_required = True
    elif action == RecoveryAction.HUMAN_REVIEW:
        next_action_str = "HUMAN_REVIEW"
        requires_human = True
    else:
        next_action_str = "STOP"

    # Human review flag
    if action == RecoveryAction.HUMAN_REVIEW or requires_human:
        requires_human = True
        approval_status = "pending"
    else:
        approval_status = "not_required"

    explanation = DecisionEngine.generate_explanation(
        classification=classification,
        action=action,
        probability=prob,
        customer_name=state.get("customer_name", "Customer"),
        tenure_months=tenure,
        failure_reason=state.get("failure_reason", "Declined"),
        amount=amount,
        currency=state.get("currency", "INR")
    )

    factors = {
        "failure_type": classification.value if classification else "soft_decline",
        "historical_success_rate": history.get("historical_success_rate", 0.90),
        "previous_attempts_count": state.get("retry_count", 0),
        "customer_tenure_months": tenure,
        "amount_risk_tier": "high" if amount >= 10000 else "medium" if amount >= 3000 else "low",
        "bank_health_score": 0.92,
        "optimal_time_slot": state.get("recommended_retry_time") or "09:30 AM",
        "network_retry_safe": classification not in [FailureType.HARD_DECLINE, FailureType.CREDENTIAL_ISSUE]
    }

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "decision",
        "status": "completed",
        "message": f"Autonomous Decision Finalized: Action = {next_action_str} (Human Review: {requires_human})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "decision",
        "status": "completed",
        "next_action": next_action_str,
        "requires_human_review": requires_human,
        "email_required": email_required,
        "timestamp": timestamp
    })

    return {
        "next_action": next_action_str,
        "recommended_action": action,
        "requires_human_review": requires_human,
        "human_approval_status": approval_status,
        "email_required": email_required,
        "explanation": explanation,
        "decision_factors": factors,
        "audit_trail": trail,
        "audit_log": audit_log
    }
