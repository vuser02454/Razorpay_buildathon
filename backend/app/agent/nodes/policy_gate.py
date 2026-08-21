from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.decision_engine import DecisionEngine
from app.models.schemas import FailureType, RecoveryAction
from app.core.config import settings

def policy_gate_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 3: Deterministic Policy Safety Gate.
    Enforces PCI-DSS, Visa/Mastercard network retry limits, and merchant-defined safety rules.
    NO LLM or AI model can override these hard deterministic Python rules.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    classification = state.get("classification")
    failure_code = str(state.get("failure_code", "")).lower()
    amount = float(state.get("amount", 2000.0))
    retry_count = int(state.get("retry_count", 0))
    max_retries = int(state.get("max_retry_count", settings.DEFAULT_MAX_RETRIES))
    is_expired = bool(state.get("is_card_expired", False))
    prob = float(state.get("recovery_probability", 0.5))

    is_safe, forced_action, rule_msg = DecisionEngine.evaluate_safety_rules(
        classification=classification,
        retry_count=retry_count,
        max_retries=max_retries,
        amount=amount,
        high_value_threshold=settings.DEFAULT_HIGH_VALUE_THRESHOLD,
        is_expired=is_expired
    )

    policy_decision = "RETRY_ELIGIBLE" if is_safe else "POLICY_BLOCKED"
    if "stolen" in failure_code or "lost" in failure_code or "fraud" in failure_code:
        policy_decision = "BLOCKED_STOLEN_CARD"
        risk_level = "critical"
    elif is_expired or classification == FailureType.CREDENTIAL_ISSUE:
        policy_decision = "BLOCKED_EXPIRED_CREDENTIALS"
        risk_level = "high"
    elif retry_count >= max_retries:
        policy_decision = "BLOCKED_MAX_RETRIES_EXCEEDED"
        risk_level = "high"
    elif amount >= settings.DEFAULT_HIGH_VALUE_THRESHOLD:
        policy_decision = "FLAGGED_HIGH_VALUE_INVOICE"
        risk_level = "medium"
    else:
        risk_level = "low"

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "policy_gate",
        "status": "completed",
        "message": f"Deterministic Policy Gate: {policy_decision} — {rule_msg}"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "policy_gate",
        "status": "completed",
        "policy_decision": policy_decision,
        "policy_reason": rule_msg,
        "is_safe": is_safe,
        "timestamp": timestamp
    })

    return {
        "policy_decision": policy_decision,
        "policy_reason": rule_msg,
        "policy_status": "PASSED" if is_safe else "BLOCKED",
        "risk_level": risk_level,
        "recommended_action": forced_action,
        "audit_trail": trail,
        "audit_log": audit_log
    }
