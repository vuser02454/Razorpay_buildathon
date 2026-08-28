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
    assert "https://share.google/IhXXtpGBbnNE8J5DV" in url or "/update-payment" in url
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
    assert "share.google" in preview["update_link"] or "update-payment" in preview["update_link"]


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
        to_email="enterprise@example.com",
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
    assert res["provider"] is not None


def test_emailjs_provider_direct_dispatch():
    """
    Verify EmailJSProvider produces structured response and safely handles sandbox simulation.
    """
    from app.services.emailjs_provider import EmailJSProvider
    res = EmailJSProvider.send_transactional(
        to_email="customer@example.com",
        subject="Payment Failed — Action Required",
        template_params={
            "customer_name": "Deepak Patel",
            "amount": 1999.0,
            "currency": "INR",
            "payment_id": "pay_test_emailjs_01",
            "failure_reason": "Insufficient funds"
        },
        email_type=EmailType.PAYMENT_FAILED
    )
    assert res["success"] is True
    assert res["recipient"] == "customer@example.com"
    assert res["message_id"] is not None
    assert "emailjs" in res["provider"].lower()


def test_emailjs_failure_diagnostics_isolation():
    """
    Simulate an EmailJS network/API error and confirm that the user-facing
    error is generic and customer-safe, while technical error is isolated in diagnostic_error.
    """
    from unittest.mock import MagicMock
    from app.services.emailjs_provider import EmailJSProvider
    
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = "The user_id param is required"

    with patch("httpx.Client.post", return_value=mock_resp):
        with patch.dict("os.environ", {
            "EMAILJS_SERVICE_ID": "service_mock",
            "EMAILJS_TEMPLATE_ID": "template_mock",
            "EMAILJS_PUBLIC_KEY": "public_mock"
        }):
            res = EmailJSProvider.send_transactional(
                to_email="user@example.com",
                subject="Test Failure",
                template_params={"customer_name": "Test"},
                email_type=EmailType.RECOVERY_ACTION_REQUIRED
            )
            assert res["success"] is False
            assert res["error"] == "We couldn't send your email right now. Please try again."
            assert "diagnostic_error" in res
            assert "400" in res["diagnostic_error"]


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
        provider="emailjs",
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


def test_dynamic_customer_recipient_resolution_xyz_gmail():
    """
    Verify payment.customer.email = 'xyz@gmail.com' is dynamically selected and used as recipient.
    """
    from app.services.emailjs_provider import EmailJSProvider
    from unittest.mock import MagicMock

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "OK"

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        with patch.dict("os.environ", {
            "EMAILJS_SERVICE_ID": "service_test",
            "EMAILJS_TEMPLATE_ID": "template_test",
            "EMAILJS_PUBLIC_KEY": "public_test"
        }):
            res = EmailJSProvider.send_transactional(
                to_email="xyz@gmail.com",
                subject="Action Required: Update Payment Method",
                template_params={
                    "customer_name": "Test Customer",
                    "amount": 3500.0,
                    "currency": "INR"
                }
            )
            assert res["success"] is True
            assert res["recipient"] == "xyz@gmail.com"
            
            # Verify exact payload sent to EmailJS REST API
            mock_post.assert_called_once()
            called_payload = mock_post.call_args[1]["json"]
            assert called_payload["template_params"]["to_email"] == "xyz@gmail.com"
            assert called_payload["template_params"]["customer_email"] == "xyz@gmail.com"


def test_different_customers_receive_own_emails():
    """
    Verify distinct customers receive transactional notifications at their own respective addresses.
    """
    from app.services.emailjs_provider import EmailJSProvider

    res_rahul = EmailJSProvider.send_transactional(
        to_email="rahul.test@gmail.com",
        subject="Payment Retry Scheduled",
        template_params={"customer_name": "Rahul Sharma", "amount": 28000.0}
    )
    res_priya = EmailJSProvider.send_transactional(
        to_email="priya.test@gmail.com",
        subject="Action Required",
        template_params={"customer_name": "Priya Venkatesh", "amount": 64000.0}
    )

    assert res_rahul["recipient"] == "rahul.test@gmail.com"
    assert res_priya["recipient"] == "priya.test@gmail.com"
    assert res_rahul["recipient"] != res_priya["recipient"]


def test_enterprise_and_admin_never_leak_as_fallback():
    """
    Verify enterprise@corp.in and admin.email are NEVER selected as customer recipients.
    """
    from app.services.emailjs_provider import EmailJSProvider

    target_email = "custom.buyer@example.com"
    admin_email = "admin@recoverai.ai"

    res = EmailJSProvider.send_transactional(
        to_email=target_email,
        subject="Invoice Update",
        template_params={"customer_name": "Buyer"}
    )
    assert res["recipient"] == target_email
    assert res["recipient"] != "enterprise@corp.in"
    assert res["recipient"] != admin_email
    assert "corp.in" not in res["recipient"]


def test_missing_customer_email_causes_safe_failure():
    """
    Verify empty or invalid customer email is rejected and does not fall back to admin or demo address.
    """
    from app.services.emailjs_provider import EmailJSProvider

    res_empty = EmailJSProvider.send_transactional(
        to_email="",
        subject="Payment Update",
        template_params={}
    )
    assert res_empty["success"] is False
    assert res_empty["status"] == "FAILED"
    assert "Invalid recipient" in res_empty["error"]

    res_invalid = EmailJSProvider.send_transactional(
        to_email="not-an-email",
        subject="Payment Update",
        template_params={}
    )
    assert res_invalid["success"] is False
    assert res_invalid["status"] == "FAILED"


# ─── ROUTE INTEGRATION TESTS: POST /api/recovery/email/send ─────────────────

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.auth import get_current_admin, AdminProfile
    from app.db.store import DEMO_ADMIN_ID

    async def override_admin():
        return AdminProfile(
            id=DEMO_ADMIN_ID,
            email="admin@recoverai.ai",
            name="Merchant Admin",
            role="ADMIN",
            created_at="2026-01-01T00:00:00Z"
        )

    app.dependency_overrides[get_current_admin] = override_admin
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_route_integration_payment_xyz_gmail(client):
    """
    Test A & H: payment.customer.email = 'xyz@gmail.com'
    → POST /api/recovery/email/send resolves xyz@gmail.com and sends it in EmailJS to_email.
    """
    from unittest.mock import MagicMock
    from app.models.schemas import Customer, Payment, PaymentStatus, PaymentFailure, FailureType, PaymentMethod

    # 1. Create a payment in the store belonging to xyz@gmail.com
    cust = Customer(id="cust_xyz_01", name="XYZ Customer", email="xyz@gmail.com")
    payment = Payment(
        id="pay_route_xyz_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust.id,
        customer=cust,
        amount=4500.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_xyz_01",
            payment_id="pay_route_xyz_01",
            error_code="CARD_EXPIRED",
            decline_reason="Expired Card",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        payment_method=PaymentMethod(id="pm_xyz_01", type="card", last4="9911"),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[payment.id] = payment

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {
                "success": True,
                "email_type": "RECOVERY_ACTION_REQUIRED",
                "recipient": "xyz@gmail.com",
                "message_id": "msg_xyz_123",
                "provider": "emailjs",
                "status": "SENT"
            }
            response = client.post(
                "/api/recovery/email/send",
                json={"payment_id": "pay_route_xyz_01"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "xyz@gmail.com" in data["message"]

            mock_emailjs.assert_called_once()
            called_args = mock_emailjs.call_args[1]
            assert called_args["to_email"] == "xyz@gmail.com"
            assert called_args["template_params"]["to_email"] == "xyz@gmail.com"
            assert "update_link" in called_args["template_params"]


def test_route_integration_payment_rahul_and_priya(client):
    """
    Test B & C: Verify different customer records receive emails at their own addresses.
    """
    from unittest.mock import MagicMock
    from app.models.schemas import Customer, Payment, PaymentStatus, PaymentFailure, FailureType, PaymentMethod

    cust_rahul = Customer(id="cust_r01", name="Rahul Test", email="rahul@gmail.com")
    pay_rahul = Payment(
        id="pay_rahul_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust_rahul.id,
        customer=cust_rahul,
        amount=28000.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_r01",
            payment_id="pay_rahul_01",
            error_code="CARD_EXPIRED",
            decline_reason="Card Expired",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        payment_method=PaymentMethod(id="pm_r01", type="card"),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[pay_rahul.id] = pay_rahul

    cust_priya = Customer(id="cust_p01", name="Priya Test", email="priya@gmail.com")
    pay_priya = Payment(
        id="pay_priya_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust_priya.id,
        customer=cust_priya,
        amount=64000.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_p01",
            payment_id="pay_priya_01",
            error_code="CARD_EXPIRED",
            decline_reason="Card Expired",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        payment_method=PaymentMethod(id="pm_p01", type="card"),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[pay_priya.id] = pay_priya

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

            # Call for Rahul
            res_r = client.post("/api/recovery/email/send", json={"payment_id": "pay_rahul_01"})
            assert res_r.status_code == 200
            assert "rahul@gmail.com" in res_r.json()["message"]
            assert mock_emailjs.call_args[1]["to_email"] == "rahul@gmail.com"

            mock_emailjs.reset_mock()

            # Call for Priya
            res_p = client.post("/api/recovery/email/send", json={"payment_id": "pay_priya_01"})
            assert res_p.status_code == 200
            assert "priya@gmail.com" in res_p.json()["message"]
            assert mock_emailjs.call_args[1]["to_email"] == "priya@gmail.com"


def test_route_integration_missing_customer_email_returns_400(client):
    """
    Test D: payment.customer.email is missing -> HTTP 400, EmailJS is NOT called.
    """
    from app.models.schemas import Customer, Payment, PaymentStatus, PaymentFailure, FailureType

    cust_no_email = Customer(id="cust_no_email_01", name="No Email User", email="")
    pay = Payment(
        id="pay_missing_email_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust_no_email.id,
        customer=cust_no_email,
        amount=1500.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_no_email_01",
            payment_id="pay_missing_email_01",
            error_code="CARD_EXPIRED",
            decline_reason="Card Expired",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[pay.id] = pay

    with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
        response = client.post(
            "/api/recovery/email/send",
            json={"payment_id": "pay_missing_email_01"}
        )
        assert response.status_code == 400
        assert "Customer email is missing" in response.json()["detail"]
        mock_emailjs.assert_not_called()


def test_route_integration_null_customer_returns_400(client):
    """
    Test E: payment.customer does not exist -> HTTP 400, EmailJS is NOT called.
    """
    from app.models.schemas import Payment, PaymentStatus, PaymentFailure, FailureType

    pay_no_cust = Payment(
        id="pay_null_cust_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id="cust_nonexistent",
        customer=None,
        amount=1500.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_null_cust_01",
            payment_id="pay_null_cust_01",
            error_code="CARD_EXPIRED",
            decline_reason="Card Expired",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[pay_no_cust.id] = pay_no_cust

    with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
        response = client.post(
            "/api/recovery/email/send",
            json={"payment_id": "pay_null_cust_01"}
        )
        assert response.status_code == 400
        assert "Customer email is missing" in response.json()["detail"]
        mock_emailjs.assert_not_called()


def test_route_integration_payload_enterprise_ignored(client):
    """
    Test F & G: payload.customer_email containing 'enterprise@corp.in' or admin email
    is strictly ignored when payment.customer.email = 'xyz@gmail.com'.
    """
    from unittest.mock import MagicMock
    from app.models.schemas import Customer, Payment, PaymentStatus, PaymentFailure, FailureType

    cust = Customer(id="cust_sec_01", name="Real Customer", email="xyz@gmail.com")
    payment = Payment(
        id="pay_sec_iso_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust.id,
        customer=cust,
        amount=5000.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_sec_01",
            payment_id="pay_sec_iso_01",
            error_code="CARD_EXPIRED",
            decline_reason="Expired Card",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[payment.id] = payment

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}
            # Attempt injection via payload.customer_email
            response = client.post(
                "/api/recovery/email/send",
                json={
                    "payment_id": "pay_sec_iso_01",
                    "customer_email": "enterprise@corp.in"
                }
            )
            assert response.status_code == 200
            assert "xyz@gmail.com" in response.json()["message"]
            assert "enterprise@corp.in" not in response.json()["message"]

            # Verify EmailJS was sent ONLY to xyz@gmail.com
            assert mock_emailjs.call_args[1]["to_email"] == "xyz@gmail.com"
            assert mock_emailjs.call_args[1]["to_email"] != "enterprise@corp.in"


def test_regression_enterprise_corp_in_never_becomes_recipient(client):
    """
    Regression Test: enterprise@corp.in can NEVER become the transactional recipient.
    """
    from unittest.mock import MagicMock
    from app.models.schemas import Customer, Payment, PaymentStatus, PaymentFailure, FailureType

    cust = Customer(id="cust_reg_01", name="Authorized User", email="authorized.user@gmail.com")
    payment = Payment(
        id="pay_reg_01",
        admin_id=DEMO_ADMIN_ID,
        customer_id=cust.id,
        customer=cust,
        amount=10000.0,
        currency="INR",
        status=PaymentStatus.FAILED,
        failure=PaymentFailure(
            id="fail_reg_01",
            payment_id="pay_reg_01",
            error_code="CARD_EXPIRED",
            decline_reason="Expired Card",
            failure_type=FailureType.CREDENTIAL_ISSUE,
            is_retryable=False,
            created_at="2026-01-01T00:00:00Z"
        ),
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z"
    )
    store.payments[payment.id] = payment

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}
            response = client.post(
                "/api/recovery/email/send",
                json={
                    "payment_id": "pay_reg_01",
                    "customer_email": "enterprise@corp.in"
                }
            )
            assert response.status_code == 200
            assert "enterprise@corp.in" not in response.json()["message"]
            assert mock_emailjs.call_args[1]["to_email"] == "authorized.user@gmail.com"




