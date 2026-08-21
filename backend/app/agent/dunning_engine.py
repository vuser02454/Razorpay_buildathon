from typing import Dict, Any
from app.models.schemas import FailureType

class DunningEngine:
    """
    Intelligent, empathetic, failure-specific Dunning Copy Generator.
    Generates personalized multi-channel copy (Email, SMS, WhatsApp) based on exact decline root causes.
    """
    @staticmethod
    def generate_dunning_copy(
        customer_name: str,
        amount: float,
        currency: str,
        failure_type: FailureType,
        payment_id: str,
        update_link: str
    ) -> Dict[str, Any]:
        first_name = customer_name.split()[0] if customer_name else "there"
        curr_symbol = "₹" if currency == "INR" else "$"
        
        if failure_type == FailureType.CREDENTIAL_ISSUE:
            subject = f"Update your payment method to keep your subscription active"
            email_body = (
                f"Hi {first_name},\n\n"
                f"We noticed that your saved payment card for your recurring subscription of {curr_symbol}{amount:,.2f} has expired.\n\n"
                f"To ensure your service continues without interruption, please take a moment to update your payment details:\n\n"
                f"👉 Update Payment Method: {update_link}\n\n"
                f"If you have already updated your details, please disregard this message.\n\n"
                f"Best regards,\nThe Billing Team"
            )
            sms_body = f"Hi {first_name}, your card for subscription ({curr_symbol}{amount:,.2f}) expired. Tap to update & avoid disruption: {update_link}"
            whatsapp_body = (
                f"👋 Hello *{first_name}*,\n\n"
                f"Your saved card has expired for your monthly renewal of *{curr_symbol}{amount:,.2f}*.\n\n"
                f"Please update your card securely in under 30 seconds:\n"
                f"🔗 {update_link}\n\n"
                f"Thank you!"
            )
        elif failure_type == FailureType.AUTH_REQUIRED:
            subject = f"Quick step required: Authorize your subscription payment ({curr_symbol}{amount:,.2f})"
            email_body = (
                f"Hi {first_name},\n\n"
                f"Your bank requires a quick 3D-Secure / OTP verification to complete your renewal payment of {curr_symbol}{amount:,.2f}.\n\n"
                f"Please click below to complete the authorization with your bank:\n\n"
                f"👉 Authorize Payment Now: {update_link}\n\n"
                f"Thank you for being a valued subscriber!"
            )
            sms_body = f"Hi {first_name}, your bank requires OTP authorization for {curr_symbol}{amount:,.2f}. Tap here to authorize: {update_link}"
            whatsapp_body = (
                f"🔐 *Action Required for {first_name}*\n\n"
                f"Your bank requested security approval for your subscription renewal ({curr_symbol}{amount:,.2f}).\n\n"
                f"Authorize instantly via Razorpay:\n{update_link}"
            )
        elif failure_type == FailureType.HARD_DECLINE:
            subject = f"Payment update needed for your account"
            email_body = (
                f"Hi {first_name},\n\n"
                f"We were unable to process your recent renewal of {curr_symbol}{amount:,.2f} with your current payment method.\n\n"
                f"Please add an alternate payment method (Card, UPI Autopay, or Netbanking) to restore your account:\n\n"
                f"👉 Add Alternate Payment Method: {update_link}\n\n"
                f"Need assistance? Reply directly to this email."
            )
            sms_body = f"Hi {first_name}, your payment of {curr_symbol}{amount:,.2f} could not be processed. Please add an alternate payment method: {update_link}"
            whatsapp_body = (
                f"⚠️ *Payment Notice for {first_name}*\n\n"
                f"We could not process your renewal ({curr_symbol}{amount:,.2f}).\n\n"
                f"Please add an alternate payment method to keep your account active:\n🔗 {update_link}"
            )
        else: # Soft decline dunning (delayed / gentle)
            subject = f"Friendly reminder regarding your subscription payment"
            email_body = (
                f"Hi {first_name},\n\n"
                f"We encountered a temporary issue processing your subscription payment of {curr_symbol}{amount:,.2f}.\n\n"
                f"We will automatically retry processing shortly, but if you'd like to complete it right away or use a different method, you can do so here:\n\n"
                f"👉 View & Manage Payment: {update_link}\n\n"
                f"Thank you for your business!"
            )
            sms_body = f"Hi {first_name}, temporary issue with your {curr_symbol}{amount:,.2f} renewal. View details or pay now: {update_link}"
            whatsapp_body = f"Hi {first_name}, we had a temporary issue processing your renewal ({curr_symbol}{amount:,.2f}). Tap to review or pay: {update_link}"

        return {
            "email": {"subject": subject, "body": email_body},
            "sms": {"body": sms_body},
            "whatsapp": {"body": whatsapp_body},
            "action_link": update_link
        }
