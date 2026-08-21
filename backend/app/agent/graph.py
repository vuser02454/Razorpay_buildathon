import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from app.agent.state import RecoveryState
from app.agent.nodes.classify_failure import classify_failure_node
from app.agent.nodes.recovery_probability import recovery_probability_node
from app.agent.nodes.policy_gate import policy_gate_node
from app.agent.nodes.decision import decision_node
from app.agent.nodes.retry_action import retry_action_node
from app.agent.nodes.communication import communication_node
from app.agent.nodes.outcome import outcome_node
from app.db.store import DEMO_ADMIN_ID

def stop_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Branch for hard declines / stolen cards / max retry stops.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "stop",
        "status": "completed",
        "message": "Payment retry execution halted per safety invariants."
    })
    return {"audit_trail": trail, "payment_status": "FAILED", "final_outcome": "do_not_retry"}

def human_review_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Branch for invoices >= ₹10,000 requiring human operator approval.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "human_review",
        "status": "completed",
        "message": "Transaction flagged for Human-in-the-Loop review."
    })
    return {
        "audit_trail": trail,
        "requires_human_review": True,
        "human_approval_status": "pending",
        "payment_status": "HUMAN_REVIEW",
        "final_outcome": "awaiting_human_approval"
    }

def action_router(state: RecoveryState) -> str:
    """
    Conditional routing function evaluating the decision node output.
    """
    next_action = state.get("next_action", "STOP")
    if next_action == "RETRY":
        return "retry_action"
    elif next_action == "CUSTOMER_ACTION":
        return "communication"
    elif next_action == "HUMAN_REVIEW":
        return "human_review"
    else:
        return "stop"

def build_recovery_graph():
    """
    Assembles the 7-node LangGraph autonomous recovery workflow.
    """
    builder = StateGraph(RecoveryState)

    # 1. Register Nodes
    builder.add_node("classify_failure", classify_failure_node)
    builder.add_node("recovery_probability", recovery_probability_node)
    builder.add_node("policy_gate", policy_gate_node)
    builder.add_node("decision", decision_node)
    builder.add_node("retry_action", retry_action_node)
    builder.add_node("communication", communication_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("stop", stop_node)
    builder.add_node("outcome", outcome_node)

    # 2. Sequential Edges (START -> Decision)
    builder.add_edge(START, "classify_failure")
    builder.add_edge("classify_failure", "recovery_probability")
    builder.add_edge("recovery_probability", "policy_gate")
    builder.add_edge("policy_gate", "decision")

    # 3. Conditional Edges (Decision -> Action Branches)
    builder.add_conditional_edges(
        "decision",
        action_router,
        {
            "retry_action": "retry_action",
            "communication": "communication",
            "human_review": "human_review",
            "stop": "stop"
        }
    )

    # 4. Action Branches -> Outcome -> END
    builder.add_edge("retry_action", "outcome")
    builder.add_edge("communication", "outcome")
    builder.add_edge("human_review", "outcome")
    builder.add_edge("stop", "outcome")
    builder.add_edge("outcome", END)

    return builder.compile()

recovery_graph_app = build_recovery_graph()

def run_recovery_workflow(payment_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the compiled LangGraph workflow with safety validation and audit logging.
    """
    initial_state: RecoveryState = {
        "payment_id": payment_data.get("payment_id", f"pay_{uuid.uuid4().hex[:8]}"),
        "admin_id": payment_data.get("admin_id", DEMO_ADMIN_ID),
        "customer_id": payment_data.get("customer_id", "cust_01"),
        "customer_name": payment_data.get("customer_name", "Customer"),
        "customer_email": payment_data.get("customer_email", "customer@example.in"),
        "amount": float(payment_data.get("amount", 2000.0)),
        "currency": payment_data.get("currency", "INR"),
        "failure_code": str(payment_data.get("failure_code", "generic_decline")),
        "failure_reason": str(payment_data.get("failure_reason", "Declined by issuing bank")),
        "payment_method_type": payment_data.get("payment_method_type", "card"),
        "is_card_expired": bool(payment_data.get("is_card_expired", False)),
        "customer_history": payment_data.get("customer_history", {
            "tenure_months": 6,
            "historical_success_rate": 0.90,
            "segment": "standard"
        }),
        "retry_count": int(payment_data.get("retry_count", 0)),
        "max_retry_count": int(payment_data.get("max_retry_count", 3)),
        "previous_attempts": int(payment_data.get("retry_count", 0)),
        "previous_successes": int(payment_data.get("previous_successes", 1)),
        "geographic_context": payment_data.get("geographic_context", "IN"),
        "current_timestamp": datetime.now(timezone.utc).isoformat(),
        "audit_trail": [],
        "audit_log": []
    }

    result = recovery_graph_app.invoke(initial_state)
    return result
