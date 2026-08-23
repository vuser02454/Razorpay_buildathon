from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.decision_engine import DecisionEngine
from app.services.shap_service import shap_service

def recovery_probability_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 2: Calibrated Machine Learning Recovery Probability & SHAP Attribution Node.
    Estimates the mathematical likelihood of transaction recovery and generates
    feature-level SHAP values explaining the prediction.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    classification = state.get("classification")
    failure_type = state.get("failure_type", "SOFT_DECLINE")
    history = state.get("customer_history", {})
    amount = float(state.get("amount", 2000.0))
    tenure_months = int(history.get("tenure_months", 8))
    retry_count = int(state.get("retry_count", 0))

    # Prepare payment and customer dictionaries for ML inference & SHAP explanation
    payment_dict = {
        "id": state.get("payment_id", "pay_unknown"),
        "amount": amount,
        "retry_count": retry_count,
        "failure_type": failure_type,
        "payment_method": {"type": state.get("payment_method_type", "card")},
        "time_since_failure_hours": 1.0,
        "customer_name": state.get("customer_name", "Customer")
    }

    # Execute SHAP Model Inference & Feature Attribution
    shap_res = shap_service.explain_payment(
        payment=payment_dict,
        customer=history,
        failure_type_str=str(failure_type)
    )

    if shap_res.available:
        prob = shap_res.recovery_probability
        conf = 0.90 if tenure_months >= 6 else 0.78
        if retry_count == 0:
            conf += 0.05
        conf = round(min(0.98, max(0.60, conf)), 2)
        # Compute optimal retry time slot
        _, _, scheduled_time = DecisionEngine.compute_ml_recovery_probability(
            classification=classification,
            customer_history=history,
            amount=amount,
            tenure_months=tenure_months,
            retry_count=retry_count
        )
    else:
        # Fallback to rule-based empirical scoring if SHAP fails
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
        "message": f"ML Recovery Probability: {int(prob * 100)}% (SHAP Explainer: {shap_res.model_version}, Confidence: {int(conf * 100)}%, Window: {scheduled_time})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "recovery_probability",
        "status": "completed",
        "recovery_probability": prob,
        "confidence": conf,
        "recommended_retry_time": scheduled_time,
        "model_version": shap_res.model_version,
        "shap_available": shap_res.available,
        "timestamp": timestamp
    })

    return {
        "recovery_probability": prob,
        "confidence": conf,
        "recommended_retry_time": scheduled_time,
        "retry_time": scheduled_time,
        "shap_explanation": shap_res.model_dump(),
        "model_version": shap_res.model_version,
        "audit_trail": trail,
        "audit_log": audit_log
    }
