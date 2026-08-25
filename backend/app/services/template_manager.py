import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, Union
from app.models.schemas import EmailType

TEMPLATES_DIR = Path(__file__).resolve().parent / "email_templates"

TECHNICAL_INFRA_PATTERNS = [
    r"smtp", r"brevo", r"whitelisting", r"unauthorized\s+ip", r"525", r"504", r"500",
    r"connection\s+refused", r"traceback", r"exception", r"api\s+key", r"secret",
    r"fastapi", r"langgraph", r"supabase", r"groq", r"gemini", r"openrouter",
    r"failed\s+to\s+connect", r"stack\s+trace", r"errno"
]

class TemplateManager:
    """
    Template Manager for RecoverAI Transactional Emails.
    Loads HTML email templates, maps email types, and injects dynamic context
    with safe default fallbacks, formatting, and strict technical error sanitization.
    """
    
    _template_cache: Dict[str, str] = {}

    TEMPLATE_MAP = {
        EmailType.RECOVERY_ACTION_REQUIRED: "recovery_action_required.html",
        EmailType.PAYMENT_UPDATE_REQUIRED: "recovery_action_required.html",
        EmailType.RETRY_SCHEDULED: "retry_scheduled.html",
        EmailType.PAYMENT_RECOVERED: "payment_recovered.html",
        EmailType.PAYMENT_FAILED: "payment_failed.html",
        EmailType.HUMAN_REVIEW: "human_review.html",
        EmailType.RECOVERY_STOPPED: "recovery_stopped.html",
        EmailType.FINAL_RECOVERY_NOTICE: "final_notice.html",
    }

    # String aliases for direct lookup
    STRING_MAP = {
        "recovery_action_required": "recovery_action_required.html",
        "payment_update_required": "recovery_action_required.html",
        "retry_scheduled": "retry_scheduled.html",
        "payment_recovered": "payment_recovered.html",
        "payment_failed": "payment_failed.html",
        "human_review": "human_review.html",
        "recovery_stopped": "recovery_stopped.html",
        "final_recovery_notice": "final_notice.html",
        "final_notice": "final_notice.html",
        "test_email": "test_email.html",
        "merchant_verification_otp": "merchant_verification_otp.html",
        "otp_verification": "merchant_verification_otp.html",
        "verification_code": "merchant_verification_otp.html",
    }

    DEFAULT_CONTEXT = {
        "customer_name": "Valued Customer",
        "merchant_name": "RecoverAI",
        "currency_symbol": "₹",
        "amount": "0.00",
        "payment_id": "pay_ref_001",
        "failure_reason": "Saved payment card has expired or requires renewal",
        "recovery_probability": "75%",
        "retry_time": "09:30 AM",
        "payment_update_url": "https://share.google/IhXXtpGBbnNE8J5DV",
        "support_email": "support@recoverai.ai",
        "headline": "Action Required: Update Payment Method",
        "body": "We could not complete your recent subscription payment. To keep your subscription active without interruption, please update your payment method.",
        "cta_text": "Update Payment Method",
        "subject": "Action required: Update your payment method",
        "otp": "123456",
        "expires_in_minutes": "5"
    }

    @classmethod
    def sanitize_business_text(cls, text: Optional[str], default_replacement: str) -> str:
        """
        Sanitizes text fields to prevent any backend, SMTP, API, or infrastructure errors
        from leaking into customer-facing email templates.
        """
        if not text or not str(text).strip():
            return default_replacement

        str_val = str(text).strip()
        lower_val = str_val.lower()

        # Check if the text contains technical/infrastructure errors or stack traces
        for pattern in TECHNICAL_INFRA_PATTERNS:
            if re.search(pattern, lower_val):
                return default_replacement

        return str_val

    @classmethod
    def resolve_template_filename(cls, email_type_or_name: Union[EmailType, str]) -> str:
        """
        Resolves an EmailType enum or template name string to the corresponding HTML filename.
        """
        if isinstance(email_type_or_name, EmailType):
            return cls.TEMPLATE_MAP.get(email_type_or_name, "recovery_action_required.html")
        
        # Check string enum matches
        try:
            enum_val = EmailType(email_type_or_name)
            return cls.TEMPLATE_MAP.get(enum_val, "recovery_action_required.html")
        except ValueError:
            pass

        clean_name = str(email_type_or_name).lower().strip()
        if clean_name in cls.STRING_MAP:
            return cls.STRING_MAP[clean_name]

        if not clean_name.endswith(".html"):
            clean_name += ".html"
        return clean_name

    @classmethod
    def load_template(cls, template_filename: str) -> str:
        """
        Reads the HTML template from disk or returns cached in-memory string.
        """
        if template_filename in cls._template_cache:
            return cls._template_cache[template_filename]

        template_path = TEMPLATES_DIR / template_filename
        if not template_path.exists():
            # Fallback to recovery_action_required.html if specific template not found
            fallback_path = TEMPLATES_DIR / "recovery_action_required.html"
            if fallback_path.exists():
                content = fallback_path.read_text(encoding="utf-8")
                cls._template_cache[template_filename] = content
                return content
            raise FileNotFoundError(f"Email template '{template_filename}' not found at {template_path}")

        content = template_path.read_text(encoding="utf-8")
        cls._template_cache[template_filename] = content
        return content

    @classmethod
    def render_template(
        cls,
        email_type_or_name: Union[EmailType, str],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Renders an HTML email template with provided context dictionary.
        Safely fills placeholders: {{ variable_name }} with values or default fallbacks,
        strictly enforcing that customer-facing content is free from technical infrastructure errors.
        """
        filename = cls.resolve_template_filename(email_type_or_name)
        raw_html = cls.load_template(filename)

        merged_context = dict(cls.DEFAULT_CONTEXT)
        if context:
            for k, v in context.items():
                if v is not None:
                    # Format amount nicely if provided as numeric
                    if k == "amount":
                        try:
                            num_amount = float(v)
                            merged_context[k] = f"{num_amount:,.2f}"
                        except (ValueError, TypeError):
                            merged_context[k] = str(v)
                    elif k == "currency":
                        merged_context["currency_symbol"] = "₹" if str(v).upper() == "INR" else "$"
                    elif k == "failure_reason":
                        merged_context[k] = cls.sanitize_business_text(
                            str(v),
                            "Saved card has expired or requires renewal"
                        )
                    elif k in ["headline", "body", "subject"]:
                        merged_context[k] = cls.sanitize_business_text(
                            str(v),
                            cls.DEFAULT_CONTEXT.get(k, "")
                        )
                    else:
                        merged_context[k] = str(v)

        # Ensure currency_symbol aligns with currency
        if "currency" in context and "currency_symbol" not in context:
            merged_context["currency_symbol"] = "₹" if str(context["currency"]).upper() == "INR" else "$"

        # Regex placeholder replacement for {{ placeholder }} or {{placeholder}}
        def replacer(match):
            key = match.group(1).strip()
            return merged_context.get(key, cls.DEFAULT_CONTEXT.get(key, ""))

        rendered_html = re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", replacer, raw_html)
        return rendered_html

    @classmethod
    def clear_cache(cls):
        """Clears in-memory template cache."""
        cls._template_cache.clear()
