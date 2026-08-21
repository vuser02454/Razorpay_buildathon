import razorpay
from typing import Dict, Any, Optional
from app.services.payment.provider_interface import PaymentProvider
from app.core.config import settings

class RazorpayProvider(PaymentProvider):
    """
    Live Razorpay Payment Provider.
    Handles recurring charges via Razorpay Subscriptions / Invoices and payment links.
    """
    def __init__(self):
        self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    def charge_recurring(self, payment_id: str, amount: float, currency: str, token_id: str) -> Dict[str, Any]:
        try:
            # Razorpay requires amount in smallest currency sub-unit (paise for INR, cents for USD)
            subunits = int(amount * 100)
            data = {
                "amount": subunits,
                "currency": currency,
                "customer_id": token_id,
                "token": token_id,
                "recurring": "1",
                "description": f"RecoverAI Automated Recovery for {payment_id}"
            }
            response = self.client.payment.createRecurringPayment(data)
            return {
                "success": response.get("status") == "captured",
                "payment_id": response.get("id"),
                "status": response.get("status"),
                "raw": response
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status": "failed"
            }

    def verify_payment_status(self, payment_id: str) -> Dict[str, Any]:
        try:
            payment = self.client.payment.fetch(payment_id)
            return {
                "success": True,
                "status": payment.get("status"),
                "amount": payment.get("amount", 0) / 100.0,
                "method": payment.get("method"),
                "error_code": payment.get("error_code"),
                "error_description": payment.get("error_description")
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def create_dunning_link(self, payment_id: str, customer_id: str, amount: float, currency: str) -> str:
        try:
            subunits = int(amount * 100)
            link_data = {
                "amount": subunits,
                "currency": currency,
                "accept_partial": False,
                "description": f"RecoverAI Payment Method Update & Invoice #{payment_id[:8]}",
                "reference_id": payment_id,
                "reminder_enable": True
            }
            link = self.client.payment_link.create(link_data)
            return link.get("short_url", f"https://rzp.io/i/recover-{payment_id[:8]}")
        except Exception:
            return f"https://rzp.io/i/recover-{payment_id[:8]}"

    def verify_webhook_signature(self, body: str, signature: str) -> bool:
        try:
            self.client.utility.verify_webhook_signature(body, signature, self.webhook_secret)
            return True
        except Exception:
            return False
