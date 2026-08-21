from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.db.store import store, DEMO_ADMIN_ID

def outcome_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 7: Final Outcome & Closed-Loop Telemetry Node.
    Consolidates execution state, updates persistent store records under tenant isolation,
    and logs immutable LangGraph audit trail entries.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    action = state.get("next_action", "STOP")
    payment_id = state.get("payment_id", "pay_unknown")
    admin_id = state.get("admin_id", DEMO_ADMIN_ID)

    if action == "RETRY":
        outcome_str = "RETRY_SCHEDULED"
        payment_status = "PENDING_RETRY"
    elif action == "CUSTOMER_ACTION":
        outcome_str = "EMAIL_DISPATCHED" if state.get("email_sent") else "CUSTOMER_ACTION_REQUIRED"
        payment_status = "ACTION_REQUIRED"
    elif action == "HUMAN_REVIEW":
        outcome_str = "ESCALATED_HUMAN_REVIEW"
        payment_status = "HUMAN_REVIEW"
    else:
        outcome_str = "DO_NOT_RETRY"
        payment_status = "FAILED"

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "outcome",
        "status": "completed",
        "message": f"Autonomous Workflow Finalized: Outcome = {outcome_str}, Status = {payment_status}"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "outcome",
        "status": "completed",
        "outcome": outcome_str,
        "payment_status": payment_status,
        "timestamp": timestamp
    })

    # Record AI interaction activity in database for audit compliance
    store.record_ai_activity(
        provider="langgraph",
        operation="autonomous_recovery_workflow",
        admin_id=admin_id,
        payment_id=payment_id,
        success=True,
        metadata={
            "outcome": outcome_str,
            "classification": state.get("failure_type"),
            "probability": state.get("recovery_probability"),
            "action": action
        }
    )

    return {
        "outcome": outcome_str,
        "final_outcome": outcome_str,
        "payment_status": payment_status,
        "audit_trail": trail,
        "audit_log": audit_log
    }
