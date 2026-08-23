from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    EmailPreviewRequest, EmailPreviewResponse,
    EmailSendRequest, EmailSendResponse,
    TestEmailRequest, TestEmailResponse,
    RecoveryCommunication, EmailType
)
from app.api.auth import get_current_admin, AdminProfile
from app.db.store import store
from app.services.email_service import EmailService
from app.services.gemini_service import GeminiService
from app.services.template_manager import TemplateManager

router = APIRouter()

@router.post("/preview", response_model=EmailPreviewResponse)
async def preview_recovery_email(
    payload: EmailPreviewRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    payment = store.get_payment_by_id(payload.payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or unauthorized")

    customer_name = payment.customer.name if payment.customer else "Valued Customer"
    customer_email = payment.customer.email if payment.customer else "customer@example.com"
    failure_type = payment.failure.failure_type.value if payment.failure else "credential_issue"
    failure_reason = payment.failure.decline_reason if payment.failure else "Saved card expired or requires bank update"
    update_link = EmailService.get_payment_update_url(payment.id)
    resolved_email_type = payload.email_type or EmailType.RECOVERY_ACTION_REQUIRED

    # Generate personalized Gemini text copy (not HTML markup)
    gemini_copy = await GeminiService.generate_dunning_email({
        "customer_name": customer_name,
        "amount": payment.amount,
        "currency": payment.currency,
        "failure_type": failure_type,
        "email_type": resolved_email_type.value if isinstance(resolved_email_type, EmailType) else str(resolved_email_type),
        "payment_update_link": update_link
    })

    # Render through TemplateManager without sending
    preview = EmailService.render_email_preview(
        email_type=resolved_email_type,
        customer_name=customer_name,
        amount=payment.amount,
        currency=payment.currency,
        payment_id=payment.id,
        failure_reason=failure_reason,
        headline=gemini_copy.headline,
        body=gemini_copy.body,
        cta_text=gemini_copy.cta_text,
        subject=gemini_copy.subject,
        update_link=update_link
    )

    return EmailPreviewResponse(
        subject=preview["subject"],
        headline=preview["headline"],
        body=preview["body"],
        cta_text=preview["cta_text"],
        tone=gemini_copy.tone,
        recipient_name=customer_name,
        recipient_email=customer_email,
        payment_amount=payment.amount,
        currency=payment.currency,
        update_link=update_link,
        html_content=preview["html_content"]
    )

@router.post("/send", response_model=EmailSendResponse)
@router.post("/send-email", response_model=EmailSendResponse)
async def send_recovery_email_endpoint(
    payload: EmailSendRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    payment = store.get_payment_by_id(payload.payment_id, admin_id=admin.id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or unauthorized")

    policy = store.get_policy(admin_id=admin.id)
    if not policy.dunning_enabled:
        raise HTTPException(status_code=400, detail="Merchant policy currently has automated email communications disabled.")

    customer_name = payload.customer_name or (payment.customer.name if payment.customer else "Valued Customer")
    customer_email = payload.customer_email or (payment.customer.email if payment.customer else None)
    if not customer_email:
        raise HTTPException(status_code=400, detail="Customer email address is required to dispatch recovery notification.")

    failure_type = payment.failure.failure_type.value if payment.failure else "credential_issue"
    failure_reason = payment.failure.decline_reason if payment.failure else "Saved card expired or requires bank update"
    update_link = EmailService.get_payment_update_url(payment.id)
    email_type = payload.email_type or EmailType.RECOVERY_ACTION_REQUIRED

    # Generate personalized Gemini text fields
    gemini_copy = await GeminiService.generate_dunning_email({
        "customer_name": customer_name,
        "amount": payment.amount,
        "currency": payment.currency,
        "failure_type": failure_type,
        "email_type": email_type.value if isinstance(email_type, EmailType) else str(email_type),
        "payment_update_link": update_link
    })

    # Render template deterministically
    preview = EmailService.render_email_preview(
        email_type=email_type,
        customer_name=customer_name,
        amount=payment.amount,
        currency=payment.currency,
        payment_id=payment.id,
        failure_reason=failure_reason,
        headline=gemini_copy.headline,
        body=gemini_copy.body,
        cta_text=gemini_copy.cta_text,
        subject=gemini_copy.subject,
        update_link=update_link
    )

    # Centralized Brevo SMTP dispatch
    result = EmailService.send_recovery_email(
        to_email=customer_email,
        customer_name=customer_name,
        subject=preview["subject"],
        html_content=preview["html_content"],
        text_content=gemini_copy.body,
        email_type=email_type
    )

    # Record communication in database store for audit trail
    diagnostic_err = result.get("diagnostic_error") or result.get("error")
    comm = store.record_communication(
        admin_id=admin.id,
        payment_id=payment.id,
        customer_name=customer_name,
        customer_email=customer_email,
        subject=preview["subject"],
        provider=result.get("provider", "brevo"),
        provider_message_id=result.get("message_id"),
        status=result.get("status", "SENT"),
        error_message=diagnostic_err,
        email_type=email_type
    )

    if not result.get("success"):
        return EmailSendResponse(
            success=False,
            message=result.get("error", "Unable to send the recovery email at this time."),
            provider="brevo",
            communication=comm
        )

    return EmailSendResponse(
        success=True,
        message=f"Transactional recovery email successfully dispatched to {customer_email}.",
        provider=result.get("provider", "brevo"),
        provider_message_id=result.get("message_id"),
        communication=comm
    )

@router.post("/test", response_model=TestEmailResponse)
async def test_email_endpoint(payload: TestEmailRequest):
    """
    Diagnostic endpoint to test Brevo SMTP delivery.
    """
    result = EmailService.send_test_email(payload.to_email)
    if not result.get("success"):
        return TestEmailResponse(
            success=False,
            provider="brevo",
            message=result.get("error", "Brevo SMTP delivery failed."),
            provider_message_id=None
        )
    return TestEmailResponse(
        success=True,
        provider=result.get("provider", "brevo"),
        message=f"Test email successfully dispatched to {payload.to_email} via Brevo SMTP.",
        provider_message_id=result.get("message_id")
    )

@router.get("/history", response_model=List[RecoveryCommunication])
async def get_communication_history(
    payment_id: Optional[str] = None,
    admin: AdminProfile = Depends(get_current_admin)
):
    return store.get_communications(admin_id=admin.id, payment_id=payment_id)
