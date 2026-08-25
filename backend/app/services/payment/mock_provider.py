import uuid
from typing import Dict, Any
from app.services.payment.provider_interface import PaymentProvider

class MockPaymentProvider(PaymentProvider):
    """
    Stateful Mock Payment Provider for Demo Mode and Hackathon evaluation.
    Provides realistic responses without external API dependencies.
    """
    def __init__(self):
        self.mock_network_delay = False

    def charge_recurring(self, payment_id: str, amount: float, currency: str, token_id: str) -> Dict[str, Any]:
        # Generates a realistic mock captured payment response
        mock_rzp_id = f"pay_mock_{uuid.uuid4().hex[:12]}"
        return {
            "success": True,
            "payment_id": mock_rzp_id,
            "status": "captured",
            "amount": amount,
            "currency": currency,
            "method": "card",
            "captured": True,
            "raw": {
                "id": mock_rzp_id,
                "entity": "payment",
                "amount": int(amount * 100),
                "currency": currency,
                "status": "captured",
                "order_id": f"order_{uuid.uuid4().hex[:10]}",
                "invoice_id": f"inv_{payment_id[:8]}",
                "international": False,
                "method": "card",
                "card_id": f"card_{uuid.uuid4().hex[:10]}",
                "bank": "HDFC",
                "wallet": None,
                "vpa": None,
                "email": "customer@demo.com",
                "contact": "+919876543210",
                "fee": int(amount * 2),
                "tax": 0,
                "error_code": None,
                "error_description": None,
                "created_at": 1708500000
            }
        }

    def retry_charge(self, payment_id: str, amount: float, currency: str = "INR", token_id: str = None) -> Dict[str, Any]:
        res = self.charge_recurring(payment_id, amount, currency, token_id or f"tok_{payment_id[:8]}")
        return {
            "success": res.get("success", True),
            "status": "success" if res.get("success", True) else "failed",
            "payment_id": res.get("payment_id"),
            "amount": amount,
            "currency": currency,
            "raw": res
        }


    def verify_payment_status(self, payment_id: str) -> Dict[str, Any]:
        return {
            "success": True,
            "status": "captured",
            "amount": 2000.0,
            "method": "card",
            "error_code": None,
            "error_description": None
        }

    def create_dunning_link(self, payment_id: str, customer_id: str, amount: float, currency: str) -> str:
        return f"https://rzp.io/i/recover-{payment_id[:8]}"

    def verify_webhook_signature(self, body: str, signature: str) -> bool:
        return True
