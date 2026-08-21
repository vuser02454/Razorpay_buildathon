from typing import List, Optional
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
    update_link = f"http://localhost:5175/update-payment?payment_id={payment.id}"

    # Generate personalized Gemini email copy
    gemini_copy = await GeminiService.generate_dunning_email({
        "customer_name": customer_name,
        "amount": payment.amount,
        "currency": payment.currency,
        "failure_type": failure_type,
        "email_type": payload.email_type.value if payload.email_type else "PAYMENT_UPDATE_REQUIRED",
        "payment_update_link": update_link
    })

    html_content = EmailService.build_responsive_html_template(
        customer_name=customer_name,
        headline=gemini_copy.headline,
        body=gemini_copy.body,
        amount=payment.amount,
        currency=payment.currency,
        update_link=update_link,
        cta_text=gemini_copy.cta_text
    )

    return EmailPreviewResponse(
        subject=gemini_copy.subject,
        headline=gemini_copy.headline,
        body=gemini_copy.body,
        cta_text=gemini_copy.cta_text,
        tone=gemini_copy.tone,
        recipient_name=customer_name,
        recipient_email=customer_email,
        payment_amount=payment.amount,
        currency=payment.currency,
        update_link=update_link,
        html_content=html_content
    )

@router.post("/send", response_model=EmailSendResponse)
async def send_recovery_email(
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
    update_link = f"http://localhost:5175/update-payment?payment_id={payment.id}"
    email_type = payload.email_type or EmailType.PAYMENT_UPDATE_REQUIRED

    # Generate approved email copy
    gemini_copy = await GeminiService.generate_dunning_email({
        "customer_name": customer_name,
        "amount": payment.amount,
        "currency": payment.currency,
        "failure_type": failure_type,
        "email_type": email_type.value,
        "payment_update_link": update_link
    })

    html_content = EmailService.build_responsive_html_template(
        customer_name=customer_name,
        headline=gemini_copy.headline,
        body=gemini_copy.body,
        amount=payment.amount,
        currency=payment.currency,
        update_link=update_link,
        cta_text=gemini_copy.cta_text
    )

    # Send via Brevo SMTP
    result = EmailService.send_recovery_email(
        to_email=customer_email,
        customer_name=customer_name,
        subject=gemini_copy.subject,
        html_content=html_content,
        text_content=gemini_copy.body
    )

    # Record communication in database
    comm = store.record_communication(
        admin_id=admin.id,
        payment_id=payment.id,
        customer_name=customer_name,
        customer_email=customer_email,
        subject=gemini_copy.subject,
        provider=result.get("provider", "brevo"),
        provider_message_id=result.get("message_id"),
        status=result.get("status", "SENT"),
        error_message=result.get("error"),
        email_type=email_type
    )

    if not result.get("success"):
        return EmailSendResponse(
            success=False,
            message=result.get("error", "Failed to dispatch email via Brevo SMTP."),
            provider="brevo",
            communication=comm
        )

    return EmailSendResponse(
        success=True,
        message=f"Transactional recovery email successfully dispatched to {customer_email} via Brevo SMTP.",
        provider="brevo",
        provider_message_id=result.get("message_id"),
        communication=comm
    )

@router.post("/test", response_model=TestEmailResponse)
async def test_email_endpoint(payload: TestEmailRequest):
    """
    Diagnostic endpoint to test Brevo SMTP delivery without authentication requirement.
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
        provider="brevo",
        message=f"Test email successfully dispatched to {payload.to_email} via Brevo SMTP.",
        provider_message_id=result.get("message_id")
    )

@router.get("/history", response_model=List[RecoveryCommunication])
async def get_communication_history(
    payment_id: Optional[str] = None,
    admin: AdminProfile = Depends(get_current_admin)
):
    return store.get_communications(admin_id=admin.id, payment_id=payment_id)
