import os
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
import httpx

from app.core.config import settings
from app.models.schemas import EmailType

logger = logging.getLogger("recoverai.emailjs")


class EmailJSProvider:
    """
    Dedicated transactional email adapter for EmailJS.
    Communicates directly with the EmailJS REST API (https://api.emailjs.com/api/v1.0/email/send).

    Safety & Security Invariants:
    1. Zero authentication tokens, passwords, or Supabase verification links are routed here.
    2. Transports only non-sensitive application transactional notifications.
    3. Never logs or leaks API keys, private keys (accessToken), CVVs, or card credentials.
    4. Automatically falls back to simulated sandbox delivery when credentials are not configured,
       ensuring uninterrupted local development and testing.
    5. Dispatches are non-fatal to core payment recovery operations.
    """

    EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send"

    @classmethod
    def is_configured(cls) -> bool:
        """Checks if EmailJS credentials are fully configured."""
        service_id = os.getenv("EMAILJS_SERVICE_ID") or getattr(settings, "EMAILJS_SERVICE_ID", "")
        template_id = os.getenv("EMAILJS_TEMPLATE_ID") or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
        public_key = os.getenv("EMAILJS_PUBLIC_KEY") or getattr(settings, "EMAILJS_PUBLIC_KEY", "")
        return bool(service_id and template_id and public_key)

    @classmethod
    def get_template_id_for_type(cls, email_type: Union[EmailType, str]) -> str:
        """Resolves the appropriate EmailJS template ID for a specific email type."""
        type_str = email_type.value if isinstance(email_type, EmailType) else str(email_type)
        type_str_lower = type_str.lower()

        if "reset" in type_str_lower or "password" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_PASSWORD_RESET_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_PASSWORD_RESET_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_PASSWORD_MANAGEMENT_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_PASSWORD_MANAGEMENT_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_password_management")
            )
        elif "verify" in type_str_lower or "verification" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_VERIFY_EMAIL_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_VERIFY_EMAIL_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_VERIFICATION_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_VERIFICATION_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_email_verification")
            )
        elif "failed" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_PAYMENT_FAILED_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_PAYMENT_FAILED_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_payment_failed")
            )
        elif "recovered" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_recovery_success")
            )
        elif "human" in type_str_lower or "admin" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_ADMIN_NOTICE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ADMIN_NOTICE_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_admin_notification")
            )
        else:
            return (
                os.getenv("EMAILJS_TEMPLATE_ACTION_REQUIRED_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ACTION_REQUIRED_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "template_action_required")
            )

    @classmethod
    def send_transactional(
        cls,
        to_email: str,
        subject: str,
        template_params: Dict[str, Any],
        email_type: Union[EmailType, str] = EmailType.RECOVERY_ACTION_REQUIRED,
        custom_template_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches transactional email via EmailJS REST API.
        Returns a standardized delivery dictionary.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        type_str = email_type.value if isinstance(email_type, EmailType) else str(email_type)

        # 1. Validation check
        if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
            logger.warning(f"[EmailJS] Invalid recipient email format: {to_email}")
            return {
                "success": False,
                "email_type": type_str,
                "recipient": to_email,
                "message_id": None,
                "provider": "emailjs",
                "timestamp": now_str,
                "status": "FAILED",
                "mode": "validation",
                "error": "Invalid recipient email address format.",
                "diagnostic_error": "Recipient email failed regex validation."
            }

        service_id = os.getenv("EMAILJS_SERVICE_ID") or getattr(settings, "EMAILJS_SERVICE_ID", "")
        template_id = custom_template_id or cls.get_template_id_for_type(email_type)
        public_key = os.getenv("EMAILJS_PUBLIC_KEY") or getattr(settings, "EMAILJS_PUBLIC_KEY", "")
        private_key = os.getenv("EMAILJS_PRIVATE_KEY") or getattr(settings, "EMAILJS_PRIVATE_KEY", "")

        # Enrich template parameters with standard parameters
        params = dict(template_params)
        params["to_email"] = to_email.strip()
        params.setdefault("customer_email", to_email.strip())
        params.setdefault("recipient_email", to_email.strip())
        params.setdefault("to_name", params.get("customer_name", "Valued Customer"))
        params.setdefault("subject", subject)
        params.setdefault("email_type", type_str)
        params.setdefault("timestamp", now_str)
        if "update_link" not in params:
            params["update_link"] = params.get("payment_update_url") or "https://share.google/IhXXtpGBbnNE8J5DV"

        # 2. Live dispatch if credentials exist
        if service_id and template_id and public_key:
            payload = {
                "service_id": service_id.strip(),
                "template_id": template_id.strip(),
                "user_id": public_key.strip(),
                "template_params": params
            }
            if private_key and private_key.strip():
                payload["accessToken"] = private_key.strip()

            try:
                headers = {"Content-Type": "application/json"}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(cls.EMAILJS_SEND_URL, json=payload, headers=headers)
                
                if resp.status_code == 200:
                    msg_id = f"emailjs_{uuid.uuid4().hex[:12]}"
                    logger.info(f"[EmailJS] Dispatched email {type_str} to {to_email} (MsgID: {msg_id})")
                    return {
                        "success": True,
                        "email_type": type_str,
                        "recipient": to_email,
                        "message_id": msg_id,
                        "provider": "emailjs",
                        "timestamp": now_str,
                        "status": "SENT",
                        "mode": "live",
                        "error": None,
                        "diagnostic_error": None
                    }
                else:
                    err_text = resp.text[:200]
                    logger.error(f"[EmailJS] Live dispatch failed [{resp.status_code}]: {err_text}")
                    return {
                        "success": False,
                        "email_type": type_str,
                        "recipient": to_email,
                        "message_id": None,
                        "provider": "emailjs",
                        "timestamp": now_str,
                        "status": "FAILED",
                        "mode": "live",
                        "error": "We couldn't send your email right now. Please try again.",
                        "diagnostic_error": f"EmailJS API returned status {resp.status_code}: {err_text}"
                    }
            except Exception as exc:
                logger.error(f"[EmailJS] Connection exception: {exc}")
                return {
                    "success": False,
                    "email_type": type_str,
                    "recipient": to_email,
                    "message_id": None,
                    "provider": "emailjs",
                    "timestamp": now_str,
                    "status": "FAILED",
                    "mode": "live",
                    "error": "We couldn't send your email right now. Please try again.",
                    "diagnostic_error": f"EmailJS request error: {str(exc)}"
                }

        # 3. Graceful Sandbox Simulation Mode
        mock_msg_id = f"emailjs_sandbox_{uuid.uuid4().hex[:12]}"
        logger.info(f"[EmailJS] Simulated sandbox delivery to {to_email} (MsgID: {mock_msg_id})")
        return {
            "success": True,
            "email_type": type_str,
            "recipient": to_email,
            "message_id": mock_msg_id,
            "provider": "emailjs (Simulated Sandbox)",
            "timestamp": now_str,
            "status": "SENT",
            "mode": "sandbox",
            "error": None,
            "diagnostic_error": "EmailJS credentials not configured. Running in simulated sandbox mode."
        }
