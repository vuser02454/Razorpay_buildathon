import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.dunning_engine import DunningEngine
from app.services.email_service import EmailService
from app.models.schemas import FailureType

def communication_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 5B / 6: Generates empathetic, failure-specific dunning copy
    and dispatches 1-click customer payment update links via the central EmailService.
    
    Architecture:
    - LangGraph decides WHEN to communicate based on policy and state.
    - EmailService + TemplateManager decides HOW the email is rendered and dispatched.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    payment_id = state.get("payment_id", "pay_unknown")
    customer_name = state.get("customer_name", "Valued Customer")
    customer_email = state.get("customer_email", "customer@example.in")
    amount = float(state.get("amount", 2000.0))
    currency = state.get("currency", "INR")
    classification = state.get("classification", FailureType.CREDENTIAL_ISSUE)
    failure_reason = state.get("failure_reason", "Card expired or requires update")

    update_link = EmailService.get_payment_update_url(payment_id)

    # Generate dunning payload copy
    dunning_payload = DunningEngine.generate_dunning_copy(
        customer_name=customer_name,
        amount=amount,
        currency=currency,
        failure_type=classification,
        payment_id=payment_id,
        update_link=update_link
    )

    email_required = state.get("email_required", True)
    email_sent = False
    message_id = None
    provider_name = "gmail"

    if email_required:
        email_data = dunning_payload.get("email", {})
        send_res = EmailService.send_payment_update_email(
            to_email=customer_email,
            customer_name=customer_name,
            amount=amount,
            currency=currency,
            payment_id=payment_id,
            failure_reason=failure_reason,
            headline=email_data.get("headline", "Payment Method Update Required"),
            body=email_data.get("body"),
            subject=email_data.get("subject"),
            cta_text=email_data.get("cta", "Update Payment Method"),
            update_link=update_link
        )
        email_sent = send_res.get("success", False)
        message_id = send_res.get("message_id")
        provider_name = send_res.get("provider", "gmail")

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "communication",
        "status": "completed",
        "message": f"Dunning Communication: Email dispatched via {provider_name} ({'Success' if email_sent else 'Sandbox Logged'}, ID: {message_id})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "communication",
        "status": "completed",
        "email_sent": email_sent,
        "message_id": message_id,
        "recipient": customer_email,
        "provider": provider_name,
        "timestamp": timestamp
    })

    return {
        "email_required": email_required,
        "email_sent": email_sent,
        "email_message_id": message_id,
        "email_content": dunning_payload.get("email"),
        "dunning_payload": dunning_payload,
        "payment_status": "ACTION_REQUIRED",
        "final_outcome": "dunning_dispatched",
        "audit_trail": trail,
        "audit_log": audit_log
    }
