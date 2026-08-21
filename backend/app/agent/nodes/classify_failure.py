from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.decision_engine import DecisionEngine
from app.models.schemas import FailureType

def classify_failure_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 1: Classifies the raw gateway failure code and decline reason
    into a standardized, auditable category without executing any payment mutations.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    failure_code = str(state.get("failure_code", "")).lower()
    failure_reason = str(state.get("failure_reason", "")).lower()
    is_expired = bool(state.get("is_card_expired", False))

    # Deterministic Rule-Based & Keyword Classification
    classification = DecisionEngine.classify_failure(
        failure_code=failure_code,
        failure_reason=failure_reason,
        is_expired=is_expired
    )

    failure_type_str = classification.value.upper()

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "classify_failure",
        "status": "completed",
        "message": f"Failure classified as: {failure_type_str} (Code: '{failure_code}', Expired: {is_expired})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "classify_failure",
        "status": "completed",
        "classification": failure_type_str,
        "timestamp": timestamp
    })

    return {
        "failure_type": failure_type_str,
        "classification": classification,
        "audit_trail": trail,
        "audit_log": audit_log
    }
