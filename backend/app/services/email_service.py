import os
import uuid
import smtplib
import socket
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
from dotenv import load_dotenv

from app.core.config import settings
from app.models.schemas import EmailType
from app.services.template_manager import TemplateManager

# Load .env file explicitly
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)


class EmailService:
    """
    Centralized Transactional Email Service for RecoverAI.
    Manages Brevo SMTP relay transport (Port 587 STARTTLS), template assembly,
    safe placeholder injection, and auditable delivery tracking with strict separation
    between customer-facing content and internal technical diagnostics.
    """

    @classmethod
    def get_payment_update_url(cls, payment_id: str) -> str:
        """
        Constructs the public customer payment update URL based on frontend public URL.
        """
        base_url = (
            os.getenv("FRONTEND_PUBLIC_URL", "")
            or getattr(settings, "FRONTEND_PUBLIC_URL", "")
            or "http://localhost:5173"
        ).rstrip("/")
        return f"{base_url}/update-payment?payment_id={payment_id}"

    @classmethod
    def _dispatch_smtp(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        email_type: Union[EmailType, str] = EmailType.RECOVERY_ACTION_REQUIRED
    ) -> Dict[str, Any]:
        smtp_host = os.getenv("BREVO_SMTP_HOST", "") or settings.BREVO_SMTP_HOST or "smtp-relay.brevo.com"
        smtp_port = int(os.getenv("BREVO_SMTP_PORT", 0) or settings.BREVO_SMTP_PORT or 587)
        smtp_user = os.getenv("BREVO_SMTP_USER", "") or settings.BREVO_SMTP_USER
        smtp_password = os.getenv("BREVO_SMTP_PASSWORD", "") or settings.BREVO_SMTP_PASSWORD

        sender_email = (
            from_email
            or os.getenv("BREVO_SENDER_EMAIL", "")
            or settings.BREVO_SENDER_EMAIL
            or "vvijwal01@gmail.com"
        )
        sender_name = (
            from_name
            or os.getenv("BREVO_SENDER_NAME", "")
            or settings.BREVO_SENDER_NAME
            or "RecoverAI"
        )

        now_str = datetime.now(timezone.utc).isoformat()
        type_str = email_type.value if isinstance(email_type, EmailType) else str(email_type)

        # Validate recipient email format
        if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
            return {
                "success": False,
                "email_type": type_str,
                "recipient": to_email,
                "message_id": None,
                "provider": "brevo",
                "timestamp": now_str,
                "status": "FAILED",
                "mode": "validation",
                "error": "Invalid recipient email address format.",
                "diagnostic_error": "Regex validation failed for recipient email address."
            }

        # Check if Brevo SMTP credentials are configured for live dispatch
        if smtp_user and smtp_password and smtp_user.strip() and smtp_password.strip():
            server = None
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = formataddr((sender_name, sender_email))
                msg["To"] = to_email
                message_id = make_msgid(domain="brevo.recoverai.com")
                msg["Message-ID"] = message_id

                # Attach Plain Text fallback
                plain_body = text_content or subject
                msg.attach(MIMEText(plain_body, "plain", "utf-8"))

                # Attach Rich HTML Content
                msg.attach(MIMEText(html_content, "html", "utf-8"))

                # Connect via SMTP + STARTTLS
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()

                # Authenticate
                server.login(smtp_user.strip(), smtp_password.strip())

                # Send
                server.send_message(msg)

                clean_msg_id = message_id.strip("<>")
                return {
                    "success": True,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": clean_msg_id,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "SENT",
                    "mode": "live",
                    "error": None,
                    "diagnostic_error": None
                }
            except smtplib.SMTPAuthenticationError as auth_err:
                err_str = str(auth_err)
                print(f"[EmailService] [Internal Diagnostic] Brevo SMTP Authentication Failed: {auth_err}")
                is_demo = os.getenv("IS_DEMO_MODE", "false").lower() == "true"
                if "525" in err_str or "Unauthorized IP" in err_str:
                    if is_demo:
                        mock_msg_id = f"brevo_demo_{uuid.uuid4().hex[:12]}"
                        return {
                            "success": True,
                            "email_type": type_str,
                            "recipient": to_email,
                            "message_id": mock_msg_id,
                            "provider": "brevo (Sandbox - IP 525)",
                            "timestamp": now_str,
                            "status": "SENT",
                            "mode": "sandbox",
                            "error": None,
                            "diagnostic_error": "Brevo IP Restriction (525): Key has IP whitelisting. Operating in sandbox mode."
                        }
                    return {
                        "success": False,
                        "email_type": type_str,
                        "recipient": to_email,
                        "message_id": None,
                        "provider": "brevo",
                        "timestamp": now_str,
                        "status": "FAILED",
                        "mode": "live",
                        "error": "Unable to send the recovery email at this time.",
                        "diagnostic_error": "Brevo IP Restriction (525): In Brevo SMTP settings, edit your key and remove any IP whitelisting restrictions."
                    }
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Unable to send the recovery email at this time.",
                    "diagnostic_error": "Brevo SMTP authentication failed. Check credentials."
                }
            except (smtplib.SMTPConnectError, socket.timeout, ConnectionRefusedError, OSError) as conn_err:
                print(f"[EmailService] [Internal Diagnostic] Brevo SMTP Connection Error: {conn_err}")
                is_demo = os.getenv("IS_DEMO_MODE", "false").lower() == "true"
                if is_demo:
                    mock_msg_id = f"brevo_sandbox_{uuid.uuid4().hex[:12]}"
                    return {
                        "success": True,
                        "email_type": type_str,
                        "recipient": to_email,
                        "message_id": mock_msg_id,
                        "provider": "brevo (Sandbox - Offline)",
                        "timestamp": now_str,
                        "status": "SENT",
                        "mode": "sandbox",
                        "error": None,
                        "diagnostic_error": f"Simulated sandbox delivery: Could not reach {smtp_host}:{smtp_port}."
                    }
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Unable to send the recovery email at this time.",
                    "diagnostic_error": f"Failed to connect to SMTP relay ({smtp_host}:{smtp_port})."
                }
            except smtplib.SMTPSenderRefused as sender_err:
                print(f"[EmailService] [Internal Diagnostic] Brevo Sender Refused: {sender_err}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Unable to send the recovery email at this time.",
                    "diagnostic_error": f"Sender email '{sender_email}' was rejected by relay."
                }
            except smtplib.SMTPRecipientsRefused as recip_err:
                print(f"[EmailService] [Internal Diagnostic] Brevo Recipient Refused: {recip_err}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Unable to send the recovery email at this time.",
                    "diagnostic_error": f"Recipient address was refused by relay."
                }
            except Exception as e:
                print(f"[EmailService] [Internal Diagnostic] Brevo SMTP General Failure: {e}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "brevo",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Unable to send the recovery email at this time.",
                    "diagnostic_error": "General SMTP failure during dispatch."
                }
            finally:
                if server:
                    try:
                        server.quit()
                    except Exception:
                        pass

        # Simulated Sandbox Delivery when Brevo credentials are not yet configured
        mock_msg_id = f"brevo_sandbox_{uuid.uuid4().hex[:12]}"
        return {
            "success": True,
            "email_type": type_str,
            "recipient": to_email,
            "message_id": mock_msg_id,
            "provider": "brevo (Simulated Sandbox)",
            "timestamp": now_str,
            "status": "SENT",
            "mode": "sandbox",
            "error": None,
            "diagnostic_error": "SMTP credentials not configured. Running in simulated sandbox mode."
        }

    # ── High-Level Clean Public API ──────────────────────────────────────────

    @classmethod
    def send_payment_update_email(
        cls,
        to_email: str,
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        failure_reason: str = "Saved card expired or requires renewal",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
        cta_text: str = "Update Payment Method",
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches a customer action payment update email with 1-click update link.
        """
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        default_headline = "Action Required: Update Your Payment Method"
        default_body = (
            f"We were unable to complete your subscription payment of "
            f"{'₹' if currency == 'INR' else '$'}{amount:,.2f}. "
            f"To keep your subscription active without interruption, please update your payment method."
        )
        resolved_subject = subject or f"Action required: Update your payment method"

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "failure_reason": failure_reason,
            "headline": headline or default_headline,
            "body": body or default_body,
            "cta_text": cta_text,
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email
        }

        html_content = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, context)
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=resolved_subject,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.RECOVERY_ACTION_REQUIRED
        )

    @classmethod
    def send_retry_notification(
        cls,
        to_email: str,
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        retry_time: str = "09:30 AM",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifies customer of an automatically scheduled smart retry.
        """
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        default_headline = "Automated Payment Retry Scheduled"
        default_body = (
            f"We noticed a temporary issue processing your subscription payment of "
            f"{'₹' if currency == 'INR' else '$'}{amount:,.2f}. Our smart recovery engine "
            f"has scheduled an automatic retry for {retry_time}. No immediate action is required."
        )
        resolved_subject = subject or f"Update on your subscription payment — retry scheduled"

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "retry_time": retry_time,
            "headline": headline or default_headline,
            "body": body or default_body,
            "cta_text": "Pay Now (Optional)",
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email
        }

        html_content = TemplateManager.render_template(EmailType.RETRY_SCHEDULED, context)
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=resolved_subject,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.RETRY_SCHEDULED
        )

    @classmethod
    def send_recovery_success_email(
        cls,
        to_email: str,
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirms successful payment recovery and subscription continuation.
        """
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        default_headline = "Payment Successful — Subscription Active"
        default_body = (
            f"Your subscription payment of {'₹' if currency == 'INR' else '$'}{amount:,.2f} "
            f"has been successfully processed. Thank you for your continued partnership!"
        )
        resolved_subject = subject or f"Receipt: Subscription payment successful ({'₹' if currency == 'INR' else '$'}{amount:,.2f})"

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "headline": headline or default_headline,
            "body": body or default_body,
            "cta_text": "View Account Details",
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email
        }

        html_content = TemplateManager.render_template(EmailType.PAYMENT_RECOVERED, context)
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=resolved_subject,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.PAYMENT_RECOVERED
        )

    @classmethod
    def send_human_review_notification(
        cls,
        to_email: str,
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifies of an account undergoing manual priority review.
        """
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        default_headline = "Priority Account Notice: Review in Progress"
        default_body = (
            f"Our billing desk is currently reviewing your account renewal of "
            f"{'₹' if currency == 'INR' else '$'}{amount:,.2f}. Your dedicated account representative "
            f"will assist with seamless continuation."
        )
        resolved_subject = subject or f"Notice: Account review in progress for your subscription"

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "headline": headline or default_headline,
            "body": body or default_body,
            "cta_text": "View Billing Status",
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email
        }

        html_content = TemplateManager.render_template(EmailType.HUMAN_REVIEW, context)
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=resolved_subject,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.HUMAN_REVIEW
        )

    @classmethod
    def send_recovery_email(
        cls,
        to_email: str,
        customer_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        email_type: Union[EmailType, str] = EmailType.RECOVERY_ACTION_REQUIRED
    ) -> Dict[str, Any]:
        """
        General purpose method to dispatch pre-rendered HTML emails via Brevo SMTP.
        Ensures 100% backward-compatibility with all existing test suites.
        """
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            from_email=from_email,
            from_name=from_name,
            email_type=email_type
        )

    @classmethod
    def send_test_email(cls, to_email: str) -> Dict[str, Any]:
        """
        Sends a diagnostic test email verifying operational connectivity.
        """
        subject = "System Diagnostic Test"
        context = {
            "customer_name": "Operator",
            "merchant_name": "RecoverAI",
            "headline": "⚡ Operational Connectivity Test",
            "body": "This is a diagnostic test email verifying that your mail relay transport is operational.",
            "subject": subject,
            "cta_text": "Open Dashboard",
            "payment_update_url": "http://localhost:5173"
        }
        html_content = TemplateManager.render_template("test_email", context)
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content="This is a test email from RecoverAI.",
            email_type=EmailType.TEST_EMAIL
        )

    @classmethod
    def send_verification_otp_email(
        cls,
        to_email: str,
        otp: str,
        expires_in_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Sends the 6-digit RecoverAI verification OTP for Razorpay integration connection via Brevo SMTP.
        Subject: RecoverAI — Your verification code
        """
        subject = "RecoverAI — Your verification code"
        context = {
            "otp": otp,
            "expires_in_minutes": str(expires_in_minutes),
            "subject": subject,
            "customer_name": "Merchant",
            "merchant_name": "RecoverAI"
        }
        html_content = TemplateManager.render_template("merchant_verification_otp", context)
        text_content = (
            f"RecoverAI\n\n"
            f"Verify your Razorpay connection\n\n"
            f"Your RecoverAI verification code is: {otp}\n\n"
            f"This code expires in {expires_in_minutes} minutes.\n\n"
            f"If you didn't request this verification, you can safely ignore this email."
        )
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            email_type=EmailType.TEST_EMAIL
        )

    @classmethod
    def render_email_preview(
        cls,
        email_type: Union[EmailType, str],
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        failure_reason: str = "Saved card expired or requires renewal",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        cta_text: str = "Update Payment Method",
        subject: Optional[str] = None,
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        sym = "₹" if currency == "INR" else "$"
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        type_key = (email_type.value if isinstance(email_type, EmailType) else str(email_type)).lower()

        # Tailored default business copy per email type
        if "retry" in type_key:
            default_headline = "Automated Payment Retry Scheduled"
            default_body = (
                f"We noticed a temporary issue with your subscription payment of {sym}{amount:,.2f}. "
                f"Our smart recovery engine has scheduled an automatic retry for 09:30 AM. No immediate action is required."
            )
            default_subject = f"Update on your subscription payment — retry scheduled"
            default_cta = "Pay Now (Optional)"
        elif "recovered" in type_key:
            default_headline = "Payment Successful — Subscription Active"
            default_body = (
                f"Your subscription payment of {sym}{amount:,.2f} has been successfully processed. "
                f"Thank you for your continued partnership!"
            )
            default_subject = f"Receipt: Subscription payment successful ({sym}{amount:,.2f})"
            default_cta = "View Account Details"
        elif "failed" in type_key:
            default_headline = "Payment Method Declined"
            default_body = (
                f"Your subscription payment of {sym}{amount:,.2f} could not be processed. "
                f"Please update your payment method to prevent service interruption."
            )
            default_subject = f"Payment Failed: Action needed for your subscription"
            default_cta = "Update Payment Method"
        elif "human" in type_key:
            default_headline = "Priority Account Notice: Review in Progress"
            default_body = (
                f"Our billing desk is currently reviewing your account renewal of {sym}{amount:,.2f}. "
                f"Your dedicated account representative will assist with seamless continuation."
            )
            default_subject = f"Notice: Account review in progress for your subscription"
            default_cta = "View Billing Status"
        elif "final" in type_key:
            default_headline = "Final Notice: Subscription Grace Window Expiring"
            default_body = (
                f"This is a final reminder regarding your overdue subscription renewal of {sym}{amount:,.2f}. "
                f"Please update your payment method to maintain uninterrupted service."
            )
            default_subject = f"Final Notice: Subscription payment pending ({sym}{amount:,.2f})"
            default_cta = "Update Payment Method"
        else:
            default_headline = "Action Required: Update Your Payment Method"
            default_body = (
                f"We could not complete your subscription payment of {sym}{amount:,.2f}. "
                f"To keep your subscription active without interruption, please update your payment method."
            )
            default_subject = f"Action required: Update your payment method"
            default_cta = "Update Payment Method"

        resolved_headline = headline or default_headline
        resolved_body = body or default_body
        resolved_subject = subject or default_subject
        resolved_cta = cta_text if cta_text != "Update Payment Method" else default_cta

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "failure_reason": failure_reason,
            "headline": resolved_headline,
            "body": resolved_body,
            "cta_text": resolved_cta,
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email
        }

        html_content = TemplateManager.render_template(email_type, context)
        return {
            "subject": resolved_subject,
            "headline": resolved_headline,
            "body": resolved_body,
            "cta_text": resolved_cta,
            "html_content": html_content,
            "update_link": payment_update_url
        }

    @classmethod
    def build_responsive_html_template(
        cls,
        customer_name: str,
        headline: str,
        body: str,
        amount: float,
        currency: str,
        update_link: Optional[str],
        cta_text: str = "Update Payment Method"
    ) -> str:
        """
        Backwards-compatible wrapper that renders using TemplateManager.
        """
        context = {
            "customer_name": customer_name,
            "headline": headline,
            "body": body,
            "amount": amount,
            "currency": currency,
            "payment_update_url": update_link or "http://localhost:5173",
            "cta_text": cta_text,
            "subject": headline
        }
        return TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, context)
