from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class PaymentProvider(ABC):
    """
    Abstract Payment Provider interface.
    Cleanly separates Razorpay production API from Mock / Simulation Providers.
    """
    
    @abstractmethod
    def charge_recurring(self, payment_id: str, amount: float, currency: str, token_id: str) -> Dict[str, Any]:
        """Attempt a recurring charge on a saved payment method."""
        pass
    
    @abstractmethod
    def retry_charge(self, payment_id: str, amount: float, currency: str, token_id: Optional[str] = None) -> Dict[str, Any]:
        """Attempt an automated smart retry charge."""
        pass

    
    @abstractmethod
    def verify_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Fetch current payment status from payment gateway."""
        pass
    
    @abstractmethod
    def create_dunning_link(self, payment_id: str, customer_id: str, amount: float, currency: str) -> str:
        """Create an authenticated Razorpay checkout/update link for customer dunning."""
        pass
    
    @abstractmethod
    def verify_webhook_signature(self, body: str, signature: str) -> bool:
        """Verify webhook authenticity."""
        pass
