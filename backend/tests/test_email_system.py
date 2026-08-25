import pytest
import asyncio
from unittest.mock import patch
import smtplib

from app.models.schemas import EmailType, FailureType
from app.services.template_manager import TemplateManager
from app.services.email_service import EmailService
from app.db.store import store, DEMO_ADMIN_ID


FORBIDDEN_CUSTOMER_STRINGS = [
    "brevo", "smtp", "smtp key", "api key", "ip whitelist", "whitelisting",
    "unauthorized ip", "525", "fastapi", "langgraph", "gemini", "groq",
    "openrouter", "supabase", "python", "traceback", "stack trace", "exception"
]


def test_template_rendering_all_types():
    """
    Verify that all standard EmailType templates render without raising errors
    and contain essential branding and layout elements.
    """
    test_context = {
        "customer_name": "Siddharth Rao",
        "merchant_name": "RecoverAI Cloud",
        "amount": 3500.0,
        "currency": "INR",
        "payment_id": "pay_test_sid_01",
        "failure_reason": "Card expired on file",
        "retry_time": "Tomorrow at 10:00 AM",
        "headline": "Action Required: Update Your Card",
        "body": "Your monthly plan of ₹3,500.00 could not be charged.",
        "cta_text": "Update Card Now",
        "payment_update_url": "http://localhost:5173/update-payment?payment_id=pay_test_sid_01",
        "support_email": "billing@recoverai.ai"
    }

    # 1. RECOVERY_ACTION_REQUIRED
    html_action = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, test_context)
    assert "Siddharth Rao" in html_action
    assert "₹3,500.00" in html_action
    assert "pay_test_sid_01" in html_action
    assert "http://localhost:5173/update-payment?payment_id=pay_test_sid_01" in html_action
    assert "Update Card Now" in html_action
    assert "RecoverAI" in html_action

    # 2. RETRY_SCHEDULED
    html_retry = TemplateManager.render_template(EmailType.RETRY_SCHEDULED, test_context)
    assert "Siddharth Rao" in html_retry
    assert "Tomorrow at 10:00 AM" in html_retry
    assert "₹3,500.00" in html_retry

    # 3. PAYMENT_RECOVERED
    html_recovered = TemplateManager.render_template(EmailType.PAYMENT_RECOVERED, test_context)
    assert "Siddharth Rao" in html_recovered
    assert "Payment Recovered" in html_recovered or "Payment Successful" in html_recovered
    assert "₹3,500.00" in html_recovered

    # 4. PAYMENT_FAILED
    html_failed = TemplateManager.render_template(EmailType.PAYMENT_FAILED, test_context)
    assert "Siddharth Rao" in html_failed
    assert "DECLINED" in html_failed or "Payment Failed" in html_failed

    # 5. HUMAN_REVIEW
    html_review = TemplateManager.render_template(EmailType.HUMAN_REVIEW, test_context)
    assert "Siddharth Rao" in html_review
    assert "Review" in html_review or "Account" in html_review

    # 6. RECOVERY_STOPPED
    html_stopped = TemplateManager.render_template(EmailType.RECOVERY_STOPPED, test_context)
    assert "Siddharth Rao" in html_stopped
    assert "Safety Lock" in html_stopped or "Halted" in html_stopped or "stopped" in html_stopped.lower()

    # 7. FINAL_RECOVERY_NOTICE
    html_final = TemplateManager.render_template(EmailType.FINAL_RECOVERY_NOTICE, test_context)
    assert "Siddharth Rao" in html_final
    assert "Reminder" in html_final or "Outstanding" in html_final


def test_customer_facing_emails_have_no_technical_jargon():
    """
    Strictly verify that customer-facing templates (Customer Action, Retry Scheduled, Payment Recovered)
    contain NO technical backend, SMTP, API, AI, or infrastructure error strings.
    """
    for email_type in [
        EmailType.RECOVERY_ACTION_REQUIRED,
        EmailType.RETRY_SCHEDULED,
        EmailType.PAYMENT_RECOVERED,
        EmailType.PAYMENT_FAILED,
        EmailType.HUMAN_REVIEW,
        EmailType.FINAL_RECOVERY_NOTICE
    ]:
        html = TemplateManager.render_template(email_type, {
            "customer_name": "Pavan Sharma",
            "amount": 2000.0,
            "payment_id": "pay_test_01",
            "failure_reason": "Saved card has expired"
        })
        html_lower = html.lower()
        for forbidden in FORBIDDEN_CUSTOMER_STRINGS:
            assert forbidden not in html_lower, f"Forbidden string '{forbidden}' found in customer template {email_type}"


def test_missing_template_variables_fallback():
    """
    Verify that rendering a template with an empty context applies safe fallback defaults
    and leaves no raw unrendered {{ placeholder }} tags.
    """
    html = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, {})
    assert "Valued Customer" in html
    assert "RecoverAI" in html
    assert "Update Payment Method" in html
    # Ensure all {{ tags }} were replaced
    assert "{{" not in html
    assert "}}" not in html


def test_technical_error_sanitization_in_templates():
    """
    Verify that if a raw backend error or exception message is passed into failure_reason,
    TemplateManager sanitizes it into a safe business message for the customer.
    """
    polluted_context = {
        "customer_name": "Kavita Nair",
        "amount": 4500.0,
        "failure_reason": "SMTPAuthenticationError: (525, b'5.7.1 Unauthorized IP address in Brevo')",
        "headline": "FastAPI LangGraph Exception in Brevo SMTP Key",
        "body": "Failed to connect to smtp-relay.brevo.com:587 with API key"
    }

    rendered = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, polluted_context)
    rendered_lower = rendered.lower()

    for forbidden in ["525", "smtp", "brevo", "unauthorized ip", "fastapi", "langgraph", "api key"]:
        assert forbidden not in rendered_lower, f"Technical term '{forbidden}' leaked into customer rendered email!"

    assert "Kavita Nair" in rendered
    assert "₹4,500.00" in rendered


def test_payment_update_url_generation():
    """
    Verify that EmailService generates valid public payment update links.
    """
    url = EmailService.get_payment_update_url("pay_inv_9988")
    assert "/update-payment?payment_id=pay_inv_9988" in url
    assert "http" in url


def test_render_email_preview_does_not_send():
    """
    Verify that render_email_preview produces full rendered preview without sending email.
    """
    preview = EmailService.render_email_preview(
        email_type=EmailType.RECOVERY_ACTION_REQUIRED,
        customer_name="Priya Patel",
        amount=1500.0,
        currency="INR",
        payment_id="pay_preview_01",
        failure_reason="Insufficient balance",
        headline="Action Required",
        body="Please update payment method.",
        cta_text="Update Payment Method"
    )

    assert preview["subject"] is not None
    assert "Priya Patel" in preview["html_content"]
    assert "₹1,500.00" in preview["html_content"]
    assert "update-payment?payment_id=pay_preview_01" in preview["update_link"]


def test_invalid_email_validation():
    """
    Verify that invalid email addresses are caught and return a clean validation error.
    """
    res = EmailService.send_payment_update_email(
        to_email="not-an-email",
        customer_name="Invalid Test",
        amount=500.0,
        payment_id="pay_bad_email"
    )
    assert res["success"] is False
    assert res["status"] == "FAILED"
    assert "Invalid recipient" in res["error"]


def test_send_payment_update_email_flow():
    """
    Verify send_payment_update_email produces a structured delivery result.
    """
    res = EmailService.send_payment_update_email(
        to_email="priya@example.in",
        customer_name="Priya Patel",
        amount=2500.0,
        currency="INR",
        payment_id="pay_priya_01",
        failure_reason="Card expired",
        headline="Please update payment details",
        body="Your subscription payment could not be completed."
    )
    assert res["success"] is True
    assert res["recipient"] == "priya@example.in"
    assert res["message_id"] is not None
    assert res["timestamp"] is not None
    assert res["provider"] is not None


def test_send_retry_notification_flow():
    """
    Verify send_retry_notification executes and returns structured response.
    """
    res = EmailService.send_retry_notification(
        to_email="rohit@example.in",
        customer_name="Rohit Verma",
        amount=1800.0,
        currency="INR",
        payment_id="pay_rohit_01",
        retry_time="09:30 AM"
    )
    assert res["success"] is True
    assert res["email_type"] == EmailType.RETRY_SCHEDULED.value


def test_send_recovery_success_email_flow():
    """
    Verify send_recovery_success_email executes and returns structured response.
    """
    res = EmailService.send_recovery_success_email(
        to_email="rohit@example.in",
        customer_name="Rohit Verma",
        amount=1800.0,
        currency="INR",
        payment_id="pay_rohit_01"
    )
    assert res["success"] is True
    assert res["email_type"] == EmailType.PAYMENT_RECOVERED.value


def test_send_human_review_notification_flow():
    """
    Verify send_human_review_notification executes and returns structured response.
    """
    res = EmailService.send_human_review_notification(
        to_email="enterprise@corp.in",
        customer_name="Enterprise Admin",
        amount=25000.0,
        currency="INR",
        payment_id="pay_ent_01"
    )
    assert res["success"] is True
    assert res["email_type"] == EmailType.HUMAN_REVIEW.value


def test_smtp_failure_diagnostics_isolation():
    """
    Simulate an SMTP server connection error and confirm that the user-facing
    error is generic and customer-safe, while technical error is isolated in diagnostic_error.
    """
    with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, "Cannot connect to mail relay")):
        with patch.dict("os.environ", {"IS_DEMO_MODE": "false", "GMAIL_SMTP_USER": "test@gmail.com", "GMAIL_SMTP_PASSWORD": "app_password"}):
            res = EmailService._dispatch_smtp(
                to_email="user@example.com",
                subject="Test Failure",
                html_content="<p>Test</p>",
                email_type=EmailType.RECOVERY_ACTION_REQUIRED
            )
            assert res["success"] is False
            assert res["error"] == "We couldn't send your email right now. Please try again."
            assert "diagnostic_error" in res
            assert "SMTP" in res["diagnostic_error"] or "connect" in res["diagnostic_error"].lower()


def test_send_test_email_diagnostic():
    """
    Verify send_test_email executes properly.
    """
    res = EmailService.send_test_email("admin@recoverai.ai")
    assert res["success"] is True
    assert res["email_type"] == EmailType.TEST_EMAIL.value


def test_supabase_communication_audit_logging():
    """
    Verify that recorded communications are persisted in store per tenant.
    """
    comm = store.record_communication(
        admin_id=DEMO_ADMIN_ID,
        payment_id="pay_audit_test_01",
        customer_name="Audit Customer",
        customer_email="audit@example.in",
        subject="Audit Test Email",
        provider="gmail",
        provider_message_id="msg_audit_123",
        status="SENT",
        email_type=EmailType.RECOVERY_ACTION_REQUIRED
    )
    assert comm.id is not None
    assert comm.admin_id == DEMO_ADMIN_ID
    assert comm.provider_message_id == "msg_audit_123"

    history = store.get_communications(admin_id=DEMO_ADMIN_ID, payment_id="pay_audit_test_01")
    assert len(history) >= 1
    assert history[-1].customer_email == "audit@example.in"
