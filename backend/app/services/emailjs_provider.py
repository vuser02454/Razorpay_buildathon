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
    2. Transports only non-sensitive application transactional notifications and password resets.
    3. Never logs or leaks API keys, private keys (accessToken), CVVs, or card credentials.
    4. Automatically falls back to simulated sandbox delivery when credentials are not configured,
       ensuring uninterrupted local development and testing.
    5. Dispatches are non-fatal to core payment recovery operations.
    """

    EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send"

    @classmethod
    def is_configured(cls) -> bool:
        """Checks if EmailJS credentials are configured."""
        service_id = (os.getenv("EMAILJS_SERVICE_ID") or getattr(settings, "EMAILJS_SERVICE_ID", "")).strip()
        public_key = (os.getenv("EMAILJS_PUBLIC_KEY") or getattr(settings, "EMAILJS_PUBLIC_KEY", "")).strip()
        has_template = bool(
            os.getenv("EMAILJS_TEMPLATE_PASSWORD_RESET_ID")
            or getattr(settings, "EMAILJS_TEMPLATE_PASSWORD_RESET_ID", "")
            or os.getenv("EMAILJS_TEMPLATE_ID")
            or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
        )
        return bool(service_id and public_key and has_template)

    @classmethod
    def get_template_id_for_type(cls, email_type: Union[EmailType, str]) -> str:
        """Resolves the appropriate EmailJS template ID for a specific email type."""
        type_str = email_type.value if isinstance(email_type, EmailType) else str(email_type)
        type_str_lower = type_str.lower()

        if "reset" in type_str_lower or "password" in type_str_lower:
            template_id = (
                os.getenv("EMAILJS_TEMPLATE_PASSWORD_RESET_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_PASSWORD_RESET_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            )
            return template_id.strip() if template_id else ""
        elif "verify" in type_str_lower or "verification" in type_str_lower:
            template_id = (
                os.getenv("EMAILJS_TEMPLATE_VERIFY_EMAIL_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_VERIFY_EMAIL_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            )
            return template_id.strip() if template_id else ""
        elif "failed" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_PAYMENT_FAILED_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_PAYMENT_FAILED_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            ).strip()
        elif "recovered" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            ).strip()
        elif "human" in type_str_lower or "admin" in type_str_lower:
            return (
                os.getenv("EMAILJS_TEMPLATE_ADMIN_NOTICE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ADMIN_NOTICE_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            ).strip()
        else:
            return (
                os.getenv("EMAILJS_TEMPLATE_ACTION_REQUIRED_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ACTION_REQUIRED_ID", "")
                or os.getenv("EMAILJS_TEMPLATE_ID")
                or getattr(settings, "EMAILJS_TEMPLATE_ID", "")
            ).strip()

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
        type_str_lower = type_str.lower()

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

        service_id = (os.getenv("EMAILJS_SERVICE_ID") or getattr(settings, "EMAILJS_SERVICE_ID", "")).strip()
        template_id = (custom_template_id or cls.get_template_id_for_type(email_type)).strip()
        public_key = (os.getenv("EMAILJS_PUBLIC_KEY") or getattr(settings, "EMAILJS_PUBLIC_KEY", "")).strip()
        private_key = (os.getenv("EMAILJS_PRIVATE_KEY") or getattr(settings, "EMAILJS_PRIVATE_KEY", "")).strip()

        # Check for missing required variables in production
        missing_vars = []
        if not service_id:
            missing_vars.append("EMAILJS_SERVICE_ID")
        if not template_id:
            missing_vars.append("EMAILJS_TEMPLATE_PASSWORD_RESET_ID" if "reset" in type_str_lower else "EMAILJS_TEMPLATE_ID")
        if not public_key:
            missing_vars.append("EMAILJS_PUBLIC_KEY")
        if not private_key:
            missing_vars.append("EMAILJS_PRIVATE_KEY")

        recipient_domain = to_email.split("@")[-1] if "@" in to_email else "unknown"

        # Enrich template parameters with canonical variables
        params = dict(template_params)
        params["to_email"] = to_email.strip()
        params.setdefault("to_name", params.get("name") or params.get("customer_name") or "User")
        params.setdefault("subject", subject)

        # For customer dunning / recovery notices only, provide update_link and tracking fields
        if "reset" not in type_str_lower and "verify" not in type_str_lower and "auth" not in type_str_lower:
            params.setdefault("customer_email", to_email.strip())
            params.setdefault("email_type", type_str)
            params.setdefault("timestamp", now_str)
            if "update_link" not in params:
                params["update_link"] = params.get("payment_update_url") or "https://share.google/IhXXtpGBbnNE8J5DV"

        # 2. Live dispatch if credentials exist
        if service_id and template_id and public_key:
            logger.info(
                f"[EmailJS] Dispatching request to endpoint='{cls.EMAILJS_SEND_URL}' | "
                f"service_id='{service_id}' | template_id='{template_id}' | "
                f"recipient_domain='@{recipient_domain}' | email_type='{type_str}'"
            )

            payload = {
                "service_id": service_id,
                "template_id": template_id,
                "user_id": public_key,
                "template_params": params
            }
            if private_key:
                payload["accessToken"] = private_key

            try:
                headers = {"Content-Type": "application/json"}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(cls.EMAILJS_SEND_URL, json=payload, headers=headers)
                
                if resp.status_code == 200:
                    msg_id = f"emailjs_{uuid.uuid4().hex[:12]}"
                    logger.info(
                        f"[EmailJS] Live dispatch SUCCESS [HTTP 200] for domain @{recipient_domain} | "
                        f"service_id='{service_id}' | template_id='{template_id}' | msg_id='{msg_id}'"
                    )
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
                    err_text = resp.text.strip()[:200]
                    logger.error(
                        f"[EmailJS] Live dispatch FAILED [HTTP {resp.status_code}] | "
                        f"service_id='{service_id}' | template_id='{template_id}' | "
                        f"recipient_domain='@{recipient_domain}' | error_response='{err_text}'"
                    )
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
                logger.error(
                    f"[EmailJS] Connection exception for domain @{recipient_domain}: "
                    f"{type(exc).__name__}: {str(exc)}"
                )
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

        # If missing variables in production/deployed environment
        if missing_vars and (os.getenv("RENDER") or os.getenv("VERCEL") or service_id or public_key or private_key):
            config_msg = f"{', '.join(missing_vars)} is not configured"
            logger.warning(f"[EmailJS] Configuration missing: {config_msg}")
            return {
                "success": False,
                "email_type": type_str,
                "recipient": to_email,
                "message_id": None,
                "provider": "emailjs",
                "timestamp": now_str,
                "status": "FAILED",
                "mode": "live",
                "error": f"Email service configuration incomplete: {config_msg}.",
                "diagnostic_error": f"Missing required environment variables: {config_msg}."
            }

        # 3. Graceful Sandbox Simulation Mode (Local Development only)
        mock_msg_id = f"emailjs_sandbox_{uuid.uuid4().hex[:12]}"
        logger.info(f"[EmailJS] Simulated sandbox delivery to domain @{recipient_domain} (MsgID: {mock_msg_id})")
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
