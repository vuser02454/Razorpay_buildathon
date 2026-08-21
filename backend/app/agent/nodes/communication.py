import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.agent.state import RecoveryState
from app.agent.dunning_engine import DunningEngine
from app.services.email_service import EmailService

def communication_node(state: RecoveryState) -> Dict[str, Any]:
    """
    Node 5B / 6: Generates empathetic, failure-specific dunning copy via Google Gemini
    and dispatches 1-click customer payment update links via Brevo SMTP (Port 587 STARTTLS).
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    payment_id = state.get("payment_id", "pay_unknown")
    customer_name = state.get("customer_name", "Valued Customer")
    customer_email = state.get("customer_email", "customer@example.in")
    amount = float(state.get("amount", 2000.0))
    currency = state.get("currency", "INR")
    classification = state.get("classification")

    update_link = f"http://localhost:5175/update-payment?payment_id={payment_id}"

    # Generate dunning payload
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

    if email_required:
        email_data = dunning_payload.get("email", {})
        html_body = EmailService.build_responsive_html_template(
            customer_name=customer_name,
            headline=email_data.get("headline", "Payment Method Update Required"),
            body=email_data.get("body", "Please update your billing details to prevent service interruption."),
            amount=amount,
            currency=currency,
            update_link=update_link,
            cta_text=email_data.get("cta", "Update Payment Details")
        )

        send_res = EmailService.send_recovery_email(
            to_email=customer_email,
            customer_name=customer_name,
            subject=email_data.get("subject", "Action required: Update payment method"),
            html_content=html_body,
            text_content=email_data.get("body")
        )
        email_sent = send_res.get("success", False)
        message_id = send_res.get("message_id")

    trail = list(state.get("audit_trail", []))
    trail.append({
        "timestamp": timestamp,
        "node": "communication",
        "status": "completed",
        "message": f"Dunning Communication: Email sent via Brevo SMTP ({'Success' if email_sent else 'Sandbox Logged'}, ID: {message_id})"
    })

    audit_log = list(state.get("audit_log", []))
    audit_log.append({
        "node": "communication",
        "status": "completed",
        "email_sent": email_sent,
        "message_id": message_id,
        "recipient": customer_email,
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
