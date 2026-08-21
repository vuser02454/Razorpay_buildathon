import os
import uuid
import smtplib
import socket
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from app.core.config import settings

# Load .env file explicitly
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)

class EmailService:
    """
    Transactional Email Service powered by Brevo SMTP for RecoverAI.
    Dispatches failure-specific dunning notices, card update links, and recovery notifications
    via Python's standard SMTP over STARTTLS.
    """

    @classmethod
    def send_recovery_email(
        cls,
        to_email: str,
        customer_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an email using Brevo SMTP.
        """
        load_dotenv(dotenv_path=ENV_FILE, override=True)

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

        # Validate recipient email format
        if not to_email or "@" not in to_email:
            return {
                "success": False,
                "message_id": None,
                "provider": "brevo",
                "status": "FAILED",
                "mode": "validation",
                "error": "Invalid recipient email address."
            }

        # Check if Brevo SMTP credentials are provided for live dispatch
        if smtp_user and smtp_password and smtp_user.strip() and smtp_password.strip():
            server = None
            try:
                # Prepare MIME Multipart alternative message
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
                
                # Authenticate with Brevo SMTP Credentials
                server.login(smtp_user.strip(), smtp_password.strip())

                # Transmit email
                server.send_message(msg)

                return {
                    "success": True,
                    "message_id": message_id.strip("<>"),
                    "provider": "brevo",
                    "status": "SENT",
                    "mode": "live",
                    "error": None
                }
            except smtplib.SMTPAuthenticationError as auth_err:
                err_str = str(auth_err)
                print(f"[EmailService] Brevo SMTP Authentication Failed: {auth_err}")
                if "525" in err_str or "Unauthorized IP" in err_str:
                    return {
                        "success": False,
                        "message_id": None,
                        "provider": "brevo",
                        "status": "FAILED",
                        "mode": "live",
                        "error": "Brevo IP Restriction (525): In Brevo SMTP settings, edit your key and remove any IP whitelisting restrictions so your IP is authorized."
                    }
                return {
                    "success": False,
                    "message_id": None,
                    "provider": "brevo",
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Brevo SMTP authentication failed. Please check BREVO_SMTP_USER and BREVO_SMTP_PASSWORD."
                }
            except (smtplib.SMTPConnectError, socket.timeout, ConnectionRefusedError, OSError) as conn_err:
                print(f"[EmailService] Brevo SMTP Connection Error: {conn_err}")
                return {
                    "success": False,
                    "message_id": None,
                    "provider": "brevo",
                    "status": "FAILED",
                    "mode": "live",
                    "error": f"Failed to connect to Brevo SMTP relay ({smtp_host}:{smtp_port}). Please verify network access."
                }
            except smtplib.SMTPSenderRefused as sender_err:
                print(f"[EmailService] Brevo Sender Refused: {sender_err}")
                return {
                    "success": False,
                    "message_id": None,
                    "provider": "brevo",
                    "status": "FAILED",
                    "mode": "live",
                    "error": f"Sender email '{sender_email}' was rejected. Ensure this sender is verified in your Brevo Senders list."
                }
            except smtplib.SMTPRecipientsRefused as recip_err:
                print(f"[EmailService] Brevo Recipient Refused: {recip_err}")
                return {
                    "success": False,
                    "message_id": None,
                    "provider": "brevo",
                    "status": "FAILED",
                    "mode": "live",
                    "error": f"Recipient address '{to_email}' was refused by Brevo SMTP."
                }
            except Exception as e:
                print(f"[EmailService] Brevo SMTP General Failure: {e}")
                return {
                    "success": False,
                    "message_id": None,
                    "provider": "brevo",
                    "status": "FAILED",
                    "mode": "live",
                    "error": "Failed to send email via Brevo SMTP relay."
                }
            finally:
                if server:
                    try:
                        server.quit()
                    except Exception:
                        pass

        # Simulated Sandbox Delivery when Brevo credentials are not yet set
        mock_msg_id = f"brevo_sandbox_{uuid.uuid4().hex[:12]}"
        return {
            "success": True,
            "message_id": mock_msg_id,
            "provider": "brevo (Simulated Sandbox)",
            "status": "SENT",
            "mode": "sandbox",
            "error": "BREVO_SMTP_USER and BREVO_SMTP_PASSWORD not configured. Running in simulated sandbox mode."
        }

    @classmethod
    def send_test_email(cls, to_email: str) -> Dict[str, Any]:
        """
        Sends a simple diagnostic test email via Brevo SMTP.
        """
        subject = "RecoverAI Email Test"
        body_text = "This is a test email from RecoverAI via Brevo SMTP."
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>RecoverAI Test Email</title></head>
        <body style="font-family: Arial, sans-serif; background-color: #030712; color: #ffffff; padding: 40px 20px; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #0f172a; padding: 32px; border-radius: 20px; border: 1px solid #1e293b;">
            <h1 style="color: #60a5fa; font-size: 24px; margin-bottom: 12px;">⚡ RecoverAI System Test</h1>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              This is a diagnostic test email verifying that your <strong>Brevo SMTP</strong> relay integration is active and operating.
            </p>
            <div style="background-color: #030712; padding: 12px; border-radius: 10px; margin: 24px 0; font-family: monospace; font-size: 12px; color: #10b981;">
              ✓ Brevo SMTP Connection Verified
            </div>
            <p style="color: #64748b; font-size: 11px;">RecoverAI Revenue Recovery Platform &bull; Brevo SMTP Relay</p>
          </div>
        </body>
        </html>
        """
        return cls.send_recovery_email(
            to_email=to_email,
            customer_name="Operator",
            subject=subject,
            html_content=html_content,
            text_content=body_text
        )

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
        sym = "₹" if currency == "INR" else "$"
        link_markup = ""
        if update_link:
            link_markup = f"""
            <div style="margin: 28px 0; text-align: center;">
              <a href="{update_link}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                {cta_text} &rarr;
              </a>
            </div>
            """

        return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{headline}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
    
    <!-- Brand Header -->
    <div style="background-color: #030712; padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <div style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
        ⚡ RecoverAI
      </div>
      <div style="color: #94a3b8; font-size: 11px; font-family: monospace; margin-top: 2px;">
        Intelligent Revenue Recovery System &bull; Brevo SMTP
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 36px 32px;">
      <div style="display: inline-block; background-color: #eff6ff; color: #1e40af; font-size: 11px; font-weight: 700; font-family: monospace; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px;">
        Payment Status Notice
      </div>
      
      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.25;">
        {headline}
      </h1>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Hi <strong>{customer_name}</strong>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
        {body}
      </p>

      <!-- Amount Summary Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 11px; font-family: monospace; color: #64748b; font-weight: 700; text-transform: uppercase;">
          Amount Due
        </div>
        <div style="font-size: 26px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 4px;">
          {sym}{amount:,.2f}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          Secured via 256-bit encrypted checkout
        </div>
      </div>

      {link_markup}

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; pt: 16px;">
        If you have already updated your payment method or completed this transaction, no further action is required. Your subscription access remains protected.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
      Powered by <strong>RecoverAI</strong> &bull; Non-intrusive payment recovery &bull; All data encrypted
    </div>

  </div>
</body>
</html>
        """
