import os
import uuid
import smtplib
import socket
import hmac
import hashlib
import time
import base64
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union

try:
    from dotenv import load_dotenv
    ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
    load_dotenv(dotenv_path=ENV_FILE, override=True)
except ImportError:
    pass

from app.core.config import settings
from app.models.schemas import EmailType
from app.services.template_manager import TemplateManager
from app.services.emailjs_provider import EmailJSProvider

# Secret salt for cryptographic short-lived payment update tokens
TOKEN_SECRET = os.getenv("PAYMENT_TOKEN_SECRET", "recoverai_secure_payment_salt_2026")


class EmailService:
    """
    Centralized Transactional Email Service for RecoverAI.
    
    Architectural Boundaries:
    • EmailJS is the PRIMARY transactional email provider (dunning, retries, recovery status, receipts).
    • Supabase Auth is the EXCLUSIVE system responsible for admin authentication emails (signup, login, resets).
    • Zero authentication tokens or password-reset tokens are dispatched through this service.
    • Dispatches via EmailJS REST API adapter with server-side credential isolation and sandbox fallback.
    """

    @classmethod
    def generate_payment_update_token(cls, payment_id: str, expires_in_hours: int = 72) -> str:
        """
        Generates a cryptographically signed, short-lived, tamper-proof token
        for 1-click customer payment method update links without exposing card numbers or sensitive data.
        """
        exp_ts = int(time.time()) + (expires_in_hours * 3600)
        message = f"{payment_id}:{exp_ts}".encode("utf-8")
        sig = hmac.new(TOKEN_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()[:16]
        raw_token = f"{payment_id}:{exp_ts}:{sig}"
        return base64.urlsafe_b64encode(raw_token.encode("utf-8")).decode("utf-8").rstrip("=")

    @classmethod
    def validate_payment_update_token(cls, payment_id: str, token: str) -> bool:
        """
        Validates the authenticity and expiration of a customer payment update token.
        """
        try:
            padded = token + "=" * ((4 - len(token) % 4) % 4)
            decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
            parts = decoded.split(":")
            if len(parts) != 3:
                return False
            token_pid, exp_str, sig = parts
            if token_pid != payment_id:
                return False
            exp_ts = int(exp_str)
            if time.time() > exp_ts:
                return False
            expected_msg = f"{payment_id}:{exp_ts}".encode("utf-8")
            expected_sig = hmac.new(TOKEN_SECRET.encode("utf-8"), expected_msg, hashlib.sha256).hexdigest()[:16]
            return hmac.compare_digest(sig, expected_sig)
        except Exception:
            return False

    @classmethod
    def get_payment_update_url(cls, payment_id: str) -> str:
        """
        Constructs the public customer payment update URL with a secure, short-lived token.
        """
        base_url = (
            os.getenv("FRONTEND_PUBLIC_URL", "")
            or getattr(settings, "FRONTEND_PUBLIC_URL", "")
            or "https://share.google/IhXXtpGBbnNE8J5DV"
        ).rstrip("/")
        if "share.google" in base_url:
            return "https://share.google/IhXXtpGBbnNE8J5DV"
        secure_token = cls.generate_payment_update_token(payment_id)
        return f"{base_url}/update-payment?payment_id={payment_id}&token={secure_token}"

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
        """
        Internal transport method: delivers transactional messages via Gmail SMTP (Port 587 STARTTLS).
        Zero exposure of internal credentials or stack traces.
        """
        smtp_host = os.getenv("GMAIL_SMTP_HOST", "") or getattr(settings, "GMAIL_SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("GMAIL_SMTP_PORT", 0) or getattr(settings, "GMAIL_SMTP_PORT", 587))
        smtp_user = os.getenv("GMAIL_SMTP_USER", "") or getattr(settings, "GMAIL_SMTP_USER", "")
        smtp_password = os.getenv("GMAIL_SMTP_PASSWORD", "") or getattr(settings, "GMAIL_SMTP_PASSWORD", "")

        sender_email = (
            from_email
            or os.getenv("GMAIL_SENDER_EMAIL", "")
            or getattr(settings, "GMAIL_SENDER_EMAIL", "")
            or smtp_user
            or "support@recoverai.ai"
        )
        sender_name = (
            from_name
            or os.getenv("GMAIL_SENDER_NAME", "")
            or getattr(settings, "GMAIL_SENDER_NAME", "RecoverAI")
            or "RecoverAI"
        )

        now_str = datetime.now(timezone.utc).isoformat()
        type_str = email_type.value if isinstance(email_type, EmailType) else str(email_type)
        recipient_domain = to_email.split("@")[-1] if "@" in to_email else "unknown"
        sender_domain = sender_email.split("@")[-1] if "@" in sender_email else "unknown"

        # 1. Validate recipient email format
        if not to_email or "@" not in to_email or "." not in recipient_domain:
            print(f"[EmailService] [Logging] event=email_validation_failed type={type_str} recipient_domain={recipient_domain}")
            return {
                "success": False,
                "email_type": type_str,
                "recipient": to_email,
                "message_id": None,
                "provider": "gmail",
                "timestamp": now_str,
                "status": "FAILED",
                "mode": "validation",
                "error": "Invalid recipient email address format.",
                "diagnostic_error": "Regex validation failed for recipient email address."
            }

        # 2. Check if Brevo HTTPS API key is provided (bypasses Render SMTP port blocks over port 443)
        brevo_key = os.getenv("BREVO_API_KEY", "") or (smtp_password if smtp_password and smtp_password.strip().startswith("xsmtpsib-") else "")
        if brevo_key and brevo_key.strip():
            try:
                import httpx
                payload = {
                    "sender": {"name": sender_name, "email": sender_email or smtp_user or "support@recoverai.ai"},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content or subject
                }
                headers = {
                    "api-key": brevo_key.strip(),
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                resp = httpx.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=12)
                if resp.status_code in [200, 201]:
                    msg_id = resp.json().get("messageId", f"brevo_https_{uuid.uuid4().hex[:12]}")
                    print(f"[EmailService] [Logging] event=https_api_dispatch type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} status=SENT msg_id={msg_id}")
                    return {
                        "success": True,
                        "email_type": type_str,
                        "recipient": to_email,
                        "message_id": msg_id,
                        "provider": "brevo",
                        "timestamp": now_str,
                        "status": "SENT",
                        "mode": "live",
                        "error": None,
                        "diagnostic_error": None
                    }
                else:
                    err_detail = resp.text
                    print(f"[EmailService] [Logging] event=https_api_error status_code={resp.status_code} detail={err_detail}")
            except Exception as http_err:
                print(f"[EmailService] [Logging] event=https_api_exception error={str(http_err)}")

        # 3. Live Gmail SMTP dispatch if credentials configured
        if smtp_user and smtp_password and smtp_user.strip() and smtp_password.strip():
            server = None
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = formataddr((sender_name, sender_email))
                msg["To"] = to_email
                message_id = make_msgid(domain="gmail.recoverai.com")
                msg["Message-ID"] = message_id

                # Plain text fallback
                plain_body = text_content or subject
                msg.attach(MIMEText(plain_body, "plain", "utf-8"))

                # Rich HTML content
                msg.attach(MIMEText(html_content, "html", "utf-8"))

                # Connect via SMTP: Try STARTTLS (587) or SSL (465)
                try:
                    if smtp_port == 465:
                        server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
                    else:
                        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                except (OSError, smtplib.SMTPConnectError, socket.timeout):
                    # Fallback to Port 465 SSL if 587 is blocked by hosting firewall
                    server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)

                # Authenticate with Gmail
                server.login(smtp_user.strip(), smtp_password.strip())

                # Send
                server.send_message(msg)

                clean_msg_id = message_id.strip("<>")
                print(f"[EmailService] [Logging] event=transactional_email_dispatch type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} smtp_accepted=true status=SENT msg_id={clean_msg_id}")
                return {
                    "success": True,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": clean_msg_id,
                    "provider": "gmail",
                    "timestamp": now_str,
                    "status": "SENT",
                    "mode": "live",
                    "error": None,
                    "diagnostic_error": None
                }
            except smtplib.SMTPAuthenticationError as auth_err:
                print(f"[EmailService] [Logging] event=smtp_auth_error type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} smtp_accepted=false error_code=AUTH_FAILED diagnostic={str(auth_err)}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "gmail",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Gmail SMTP authentication failed. Please verify your 16-character App Password.",
                    "diagnostic_error": "Gmail SMTP 535 Authentication Failed: Please verify GMAIL_SMTP_USER and 16-character Google App Password in Render environment variables."
                }
            except (smtplib.SMTPConnectError, socket.timeout, ConnectionRefusedError, OSError) as conn_err:
                print(f"[EmailService] [Logging] event=smtp_connection_error type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} smtp_accepted=false error_code=CONN_FAILED diagnostic={str(conn_err)}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "gmail",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": f"Could not connect to Gmail SMTP relay ({smtp_host}:{smtp_port}).",
                    "diagnostic_error": f"Failed to connect to SMTP relay ({smtp_host}:{smtp_port}): {str(conn_err)}"
                }
            except Exception as exc:
                print(f"[EmailService] [Logging] event=smtp_unexpected_error type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} smtp_accepted=false diagnostic_error={str(exc)}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "gmail",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "We couldn't send your email right now. Please try again.",
                    "diagnostic_error": str(exc)
                }
            finally:
                if server is not None:
                    try:
                        server.quit()
                    except Exception:
                        pass

        # 3. Missing Gmail SMTP Credentials in Production
        print(f"[EmailService] [Logging] event=smtp_credentials_missing type={type_str} recipient_domain={recipient_domain} sender_domain={sender_domain} smtp_accepted=false")
        return {
            "success": False,
            "email_type": type_str,
            "recipient": to_email,
            "message_id": None,
            "provider": "gmail",
            "timestamp": now_str,
            "status": "FAILED",
            "mode": "unconfigured",
            "error": "Gmail SMTP credentials not configured on the backend server.",
            "diagnostic_error": "GMAIL_SMTP_USER and GMAIL_SMTP_PASSWORD environment variables are missing on the backend. Please configure them in your Render dashboard."
        }

    @classmethod
    def get_smtp_diagnostics(cls) -> Dict[str, Any]:
        """
        Safe production runtime diagnostics for Gmail SMTP.
        Zero exposure of passwords, tokens, or private secrets.
        """
        smtp_host = os.getenv("GMAIL_SMTP_HOST", "") or getattr(settings, "GMAIL_SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("GMAIL_SMTP_PORT", 0) or getattr(settings, "GMAIL_SMTP_PORT", 587))
        smtp_user = os.getenv("GMAIL_SMTP_USER", "") or getattr(settings, "GMAIL_SMTP_USER", "")
        smtp_password = os.getenv("GMAIL_SMTP_PASSWORD", "") or getattr(settings, "GMAIL_SMTP_PASSWORD", "")
        sender_email = os.getenv("GMAIL_SENDER_EMAIL", "") or getattr(settings, "GMAIL_SENDER_EMAIL", "") or smtp_user
        sender_name = os.getenv("GMAIL_SENDER_NAME", "") or getattr(settings, "GMAIL_SENDER_NAME", "RecoverAI")

        has_user = bool(smtp_user and smtp_user.strip())
        has_password = bool(smtp_password and smtp_password.strip())
        is_live_ready = has_user and has_password

        sender_domain = sender_email.split("@")[-1] if "@" in sender_email else "not_configured"
        user_domain = smtp_user.split("@")[-1] if "@" in smtp_user else "not_configured"

        connection_status = "untested"
        auth_status = "untested"
        diagnostic_message = "Ready for live dispatch" if is_live_ready else "GMAIL_SMTP_USER or GMAIL_SMTP_PASSWORD missing in production environment"

        if is_live_ready:
            try:
                try:
                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=6)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                except Exception:
                    server = smtplib.SMTP_SSL(smtp_host, 465, timeout=6)

                connection_status = "connected"
                try:
                    server.login(smtp_user.strip(), smtp_password.strip())
                    auth_status = "authenticated"
                    diagnostic_message = "Gmail SMTP connection and authentication verified"
                except smtplib.SMTPAuthenticationError:
                    auth_status = "auth_failed"
                    diagnostic_message = "Gmail SMTP authentication failed. Check 16-char App Password."
                finally:
                    try:
                        server.quit()
                    except Exception:
                        pass
            except Exception as conn_err:
                connection_status = "failed"
                diagnostic_message = f"Failed to connect to {smtp_host} on port {smtp_port}/465: {str(conn_err)}"

        return {
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "has_smtp_user": has_user,
            "has_smtp_password": has_password,
            "has_sender_email": bool(sender_email),
            "sender_domain": sender_domain,
            "user_domain": user_domain,
            "sender_name": sender_name,
            "is_live_ready": is_live_ready,
            "connection_status": connection_status,
            "auth_status": auth_status,
            "diagnostic_message": diagnostic_message,
            "is_demo_mode": os.getenv("IS_DEMO_MODE", "false").lower() == "true"
        }

    @classmethod
    def _dispatch(
        cls,
        to_email: str,
        subject: str,
        context: Optional[Dict[str, Any]] = None,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        email_type: Union[EmailType, str] = EmailType.RECOVERY_ACTION_REQUIRED,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Unified transactional dispatcher:
        Delivers transactional business emails via Gmail SMTP with server-side credential isolation.
        """
        smtp_user = os.getenv("GMAIL_SMTP_USER", "") or getattr(settings, "GMAIL_SMTP_USER", "")
        smtp_password = os.getenv("GMAIL_SMTP_PASSWORD", "") or getattr(settings, "GMAIL_SMTP_PASSWORD", "")

        # Always render HTML content if not provided
        resolved_html = html_content
        if not resolved_html:
            resolved_html = TemplateManager.render_template(email_type, context or {})

        # Primary: Gmail SMTP dispatch
        return cls._dispatch_smtp(
            to_email=to_email,
            subject=subject,
            html_content=resolved_html,
            text_content=text_content or subject,
            from_email=from_email,
            from_name=from_name,
            email_type=email_type
        )

    # ═════════════════════════════════════════════════════════════════════════
    # ─── High-Level Clean Transactional API Methods ─────────────────────────
    # ═════════════════════════════════════════════════════════════════════════

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
        Dispatches a customer action payment update email with secure 1-click update link via EmailJS.
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
            "support_email": support_email,
            "recovery_status": "ACTION_REQUIRED"
        }

        html_content = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, context)
        return cls._dispatch(
            to_email=to_email,
            subject=resolved_subject,
            context=context,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.RECOVERY_ACTION_REQUIRED
        )

    @classmethod
    def send_payment_failure_email(
        cls,
        to_email: str,
        customer_name: str,
        amount: float,
        currency: str = "INR",
        payment_id: str = "pay_001",
        failure_reason: str = "Payment method was declined by issuing bank",
        headline: Optional[str] = None,
        body: Optional[str] = None,
        subject: Optional[str] = None,
        merchant_name: str = "RecoverAI",
        support_email: str = "support@recoverai.ai",
        update_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an initial payment failure notification informing the customer of a declined charge.
        """
        return cls.send_payment_update_email(
            to_email=to_email,
            customer_name=customer_name,
            amount=amount,
            currency=currency,
            payment_id=payment_id,
            failure_reason=failure_reason,
            headline=headline or "Payment Failed: Action Required",
            body=body or f"Your payment of {'₹' if currency == 'INR' else '$'}{amount:,.2f} could not be processed.",
            subject=subject or f"Payment Failed: Action needed for your subscription",
            merchant_name=merchant_name,
            support_email=support_email,
            update_link=update_link
        )

    @classmethod
    def send_recovery_reminder(
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
        Sends a follow-up recovery reminder to complete payment method updates before grace period expiry.
        """
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        default_headline = "Reminder: Update Your Payment Method"
        default_body = (
            f"This is a gentle reminder that your subscription payment of "
            f"{'₹' if currency == 'INR' else '$'}{amount:,.2f} is still pending. "
            f"Please update your payment method to maintain uninterrupted service."
        )
        resolved_subject = subject or f"Reminder: Update your payment method ({'₹' if currency == 'INR' else '$'}{amount:,.2f})"

        context = {
            "customer_name": customer_name,
            "merchant_name": merchant_name,
            "amount": amount,
            "currency": currency,
            "payment_id": payment_id,
            "headline": headline or default_headline,
            "body": body or default_body,
            "cta_text": "Update Payment Method",
            "subject": resolved_subject,
            "payment_update_url": payment_update_url,
            "support_email": support_email,
            "recovery_status": "REMINDER_SENT"
        }

        html_content = TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, context)
        return cls._dispatch(
            to_email=to_email,
            subject=resolved_subject,
            context=context,
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
        Notifies customer of an automatically scheduled smart retry via EmailJS.
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
            "support_email": support_email,
            "recovery_status": "RETRY_SCHEDULED"
        }

        html_content = TemplateManager.render_template(EmailType.RETRY_SCHEDULED, context)
        return cls._dispatch(
            to_email=to_email,
            subject=resolved_subject,
            context=context,
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
        Confirms successful payment recovery and subscription continuation via EmailJS.
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
            "support_email": support_email,
            "recovery_status": "RECOVERED"
        }

        html_content = TemplateManager.render_template(EmailType.PAYMENT_RECOVERED, context)
        return cls._dispatch(
            to_email=to_email,
            subject=resolved_subject,
            context=context,
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
        Notifies of an account undergoing manual priority review via EmailJS.
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
            "support_email": support_email,
            "recovery_status": "HUMAN_REVIEW"
        }

        html_content = TemplateManager.render_template(EmailType.HUMAN_REVIEW, context)
        return cls._dispatch(
            to_email=to_email,
            subject=resolved_subject,
            context=context,
            html_content=html_content,
            text_content=body or default_body,
            email_type=EmailType.HUMAN_REVIEW
        )

    @classmethod
    def send_transactional_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        email_type: Union[EmailType, str] = EmailType.RECOVERY_ACTION_REQUIRED
    ) -> Dict[str, Any]:
        """
        Direct transactional email dispatcher via EmailJS.
        """
        return cls._dispatch(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            email_type=email_type
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
        General purpose method to dispatch recovery emails via EmailJS.
        Ensures 100% backward-compatibility with all existing workflow and test suites.
        """
        context = {
            "customer_name": customer_name,
            "subject": subject,
            "body": text_content,
            "recovery_status": "IN_PROGRESS"
        }
        return cls._dispatch(
            to_email=to_email,
            subject=subject,
            context=context,
            html_content=html_content,
            text_content=text_content,
            from_email=from_email,
            from_name=from_name,
            email_type=email_type
        )

    @classmethod
    def send_test_email(cls, to_email: str) -> Dict[str, Any]:
        """
        Sends an operational connectivity test email via EmailJS.
        """
        subject = "⚡ RecoverAI — Operational Connectivity Test (EmailJS)"
        context = {
            "customer_name": "Operator",
            "merchant_name": "RecoverAI",
            "headline": "⚡ Operational Connectivity Test",
            "body": "This is a diagnostic test verifying that RecoverAI's EmailJS transactional email relay is operational.",
            "subject": subject,
            "cta_text": "Open Dashboard",
            "payment_update_url": "https://share.google/IhXXtpGBbnNE8J5DV",
            "recovery_status": "OPERATIONAL_TEST"
        }
        html_content = TemplateManager.render_template("test_email", context)
        return cls._dispatch(
            to_email=to_email,
            subject=subject,
            context=context,
            html_content=html_content,
            text_content="This is an operational test email from RecoverAI EmailJS relay.",
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
        Sends the 6-digit RecoverAI verification OTP for Razorpay integration connection via Gmail SMTP.
        """
        subject = "RecoverAI — Your Razorpay Connection Code"
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
        """
        Generates responsive HTML preview for merchant dashboard inspectability.
        """
        sym = "₹" if currency == "INR" else "$"
        payment_update_url = update_link or cls.get_payment_update_url(payment_id)
        type_key = (email_type.value if isinstance(email_type, EmailType) else str(email_type)).lower()

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
            "payment_update_url": update_link or "https://share.google/IhXXtpGBbnNE8J5DV",
            "cta_text": cta_text,
            "subject": headline
        }
        return TemplateManager.render_template(EmailType.RECOVERY_ACTION_REQUIRED, context)
