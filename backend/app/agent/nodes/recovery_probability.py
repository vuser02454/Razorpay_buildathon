from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.decision_engine import DecisionEngine

def recovery_probability_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 2: Feature-weighted Machine Learning / Empirical scoring node.
    Estimates the mathematical likelihood of transaction recovery and the optimal retry clearing slot.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    classification = state.get("classification")
    history = state.get("customer_history", {})
    amount = float(state.get("amount", 2000.0))
    tenure_months = int(history.get("tenure_months", 6))
    retry_count = int(state.get("retry_count", 0))

    prob, conf, scheduled_time = DecisionEngine.compute_ml_recovery_probability(
        classification=classification,
        customer_history=history,
        amount=amount,
        tenure_months=tenure_months,
        retry_count=retry_count
    )

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "recovery_probability",
        "status": "completed",
        "message": f"ML Recovery Probability: {int(prob * 100)}% (Confidence: {int(conf * 100)}%, Optimal Retry Window: {scheduled_time})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "recovery_probability",
        "status": "completed",
        "recovery_probability": prob,
        "confidence": conf,
        "recommended_retry_time": scheduled_time,
        "timestamp": timestamp
    })

    return {
        "recovery_probability": prob,
        "confidence": conf,
        "recommended_retry_time": scheduled_time,
        "retry_time": scheduled_time,
        "audit_trail": trail,
        "audit_log": audit_log
    }
