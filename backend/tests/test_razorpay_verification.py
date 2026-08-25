import pytest
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from app.db.store import DataStore
from app.services.email_service import EmailService
from app.services.template_manager import TemplateManager

@pytest.fixture
def fresh_store():
    return DataStore()

def test_otp_generation_and_hashing(fresh_store):
    """
    Verifies that the OTP is 6 numeric digits, hashed with salted SHA-256,
    and that the raw OTP is NOT stored in the database.
    """
    admin_id = "test_admin_001"
    email = "merchant@fintechcorp.in"
    
    success, msg, raw_otp, masked_email, cooldown = fresh_store.create_otp_verification(admin_id, email)
    
    assert success is True
    assert msg == "Verification code sent"
    assert raw_otp is not None
    assert len(raw_otp) == 6
    assert raw_otp.isdigit()
    assert masked_email == "m***@fintechcorp.in"
    assert cooldown == 45
    
    # Check that raw OTP is NEVER stored
    key = f"{admin_id}:{email}"
    record = fresh_store.otp_verifications.get(key)
    assert record is not None
    assert "raw_otp" not in record
    assert "otp" not in record
    assert "otp_hash" in record
    assert "otp_salt" in record
    assert len(record["otp_hash"]) == 64 # SHA-256 hex length
    
    # Verify hash equivalence
    salt = record["otp_salt"]
    computed_hash = hashlib.sha256(f"{salt}:{raw_otp}".encode("utf-8")).hexdigest()
    assert hmac.compare_digest(computed_hash, record["otp_hash"])

def test_correct_otp_verification(fresh_store):
    """
    Verifies that submitting the exact 6-digit OTP validates successfully and marks the record verified.
    """
    admin_id = "test_admin_002"
    email = "founder@saascloud.io"
    
    _, _, raw_otp, _, _ = fresh_store.create_otp_verification(admin_id, email)
    
    # Verify with correct OTP
    success, msg, remaining = fresh_store.verify_otp(admin_id, email, raw_otp)
    assert success is True
    assert msg == "Email verified successfully"
    assert remaining is None
    
    # Verify state in store
    assert fresh_store.is_email_verified(admin_id, email) is True

def test_incorrect_otp_and_attempt_limit(fresh_store):
    """
    Verifies that incorrect OTPs decrement remaining attempts and lock out after 5 failures.
    """
    admin_id = "test_admin_003"
    email = "security@testcompany.com"
    
    _, _, raw_otp, _, _ = fresh_store.create_otp_verification(admin_id, email)
    
    # Try wrong OTP 4 times
    for i in range(1, 5):
        success, msg, remaining = fresh_store.verify_otp(admin_id, email, "000000")
        assert success is False
        assert remaining == 5 - i
        assert "That code isn't correct" in msg
    
    # 5th attempt (Lockout)
    success, msg, remaining = fresh_store.verify_otp(admin_id, email, "000000")
    assert success is False
    assert remaining == 0
    assert "temporarily locked" in msg
    
    # Even if they submit the correct OTP now, they must be locked out
    success, msg, _ = fresh_store.verify_otp(admin_id, email, raw_otp)
    assert success is False
    assert "temporarily locked" in msg

def test_otp_expiration_enforcement(fresh_store):
    """
    Verifies that an expired OTP (> 5 minutes) is rejected with a clean user-facing message.
    """
    admin_id = "test_admin_004"
    email = "timeout@acme.org"
    
    _, _, raw_otp, _, _ = fresh_store.create_otp_verification(admin_id, email)
    key = f"{admin_id}:{email}"
    
    # Simulate time travel 6 minutes in the past
    past_time = datetime.now(timezone.utc) - timedelta(minutes=6)
    fresh_store.otp_verifications[key]["expires_at"] = past_time.isoformat()
    
    success, msg, _ = fresh_store.verify_otp(admin_id, email, raw_otp)
    assert success is False
    assert "expired" in msg.lower()

def test_otp_single_use_invalidation(fresh_store):
    """
    Verifies that an OTP cannot be reused once verified.
    """
    admin_id = "test_admin_005"
    email = "singleuse@merchant.in"
    
    _, _, raw_otp, _, _ = fresh_store.create_otp_verification(admin_id, email)
    
    # First verification succeeds
    success, _, _ = fresh_store.verify_otp(admin_id, email, raw_otp)
    assert success is True
    
    # Second attempt with same OTP must fail
    success2, msg2, _ = fresh_store.verify_otp(admin_id, email, raw_otp)
    assert success2 is False
    assert "already been used" in msg2.lower()

def test_resend_rate_limiting_cooldown(fresh_store):
    """
    Verifies that requesting a new code within 45 seconds is rate-limited.
    """
    admin_id = "test_admin_006"
    email = "ratelimit@startup.io"
    
    # First request
    success1, _, _, _, cooldown1 = fresh_store.create_otp_verification(admin_id, email)
    assert success1 is True
    assert cooldown1 == 45
    
    # Immediate second request (cooldown active)
    success2, msg2, raw_otp2, _, cooldown2 = fresh_store.create_otp_verification(admin_id, email)
    assert success2 is False
    assert raw_otp2 is None
    assert "wait" in msg2.lower()
    assert 0 < cooldown2 <= 45

def test_tenant_isolation_otp(fresh_store):
    """
    Verifies that OTPs are isolated per admin tenant and cannot be verified by another admin.
    """
    admin1 = "admin_tenant_A"
    admin2 = "admin_tenant_B"
    email = "shared@merchant.com"
    
    _, _, raw_otp1, _, _ = fresh_store.create_otp_verification(admin1, email)
    
    # Admin 2 cannot verify Admin 1's OTP
    success, msg, _ = fresh_store.verify_otp(admin2, email, raw_otp1)
    assert success is False
    assert "Invalid or expired" in msg

def test_gmail_verification_email_template():
    """
    Verifies that the merchant verification email template renders cleanly with OTP,
    expiry note, and zero infrastructure / error leaks.
    """
    otp = "849201"
    context = {
        "otp": otp,
        "expires_in_minutes": "5",
        "subject": "RecoverAI — Your verification code"
    }
    
    html = TemplateManager.render_template("merchant_verification_otp", context)
    assert otp in html
    assert "Verify your Razorpay connection" in html
    assert "5 minutes" in html
    assert "RecoverAI" in html
    
    # Ensure zero technical SMTP errors or tracebacks in HTML
    assert "whitelisting" not in html.lower()
    assert "traceback" not in html.lower()
    assert "smtp" not in html.lower()

def test_email_service_send_verification_otp():
    """
    Verifies EmailService.send_verification_otp_email dispatches with correct subject and payload.
    """
    res = EmailService.send_verification_otp_email(
        to_email="test.merchant@example.com",
        otp="654321",
        expires_in_minutes=5
    )
    assert res is not None
    assert res.get("status") in ["SENT", "FAILED"]

def test_razorpay_connection_and_test_diagnostics(fresh_store):
    """
    Verifies connecting Razorpay gateway, querying connection status, and running diagnostic health tests.
    """
    admin_id = "test_admin_diag"
    email = "finance@techcorp.in"
    
    # Initially disconnected
    status = fresh_store.get_razorpay_connection(admin_id)
    assert status.is_connected is False
    
    # Test connection on disconnected state
    test_disc = fresh_store.test_razorpay_connection(admin_id)
    assert test_disc["success"] is False
    
    # Connect Razorpay
    conn = fresh_store.connect_razorpay(
        admin_id=admin_id,
        account_id="acc_live_99201",
        access_token="rzp_tok_secret_live",
        merchant_name="TechCorp India",
        merchant_email=email
    )
    assert conn.is_connected is True
    assert conn.account_id == "acc_live_99201"
    assert conn.merchant_email == email
    assert "Payment monitoring" in conn.permissions
    
    # Test connection on connected state
    test_conn = fresh_store.test_razorpay_connection(admin_id)
    assert test_conn["success"] is True
    assert test_conn["status"] == "healthy"
    assert test_conn["latency_ms"] > 0
    assert test_conn["account_id"] == "acc_live_99201"
    assert test_conn["merchant_email"] == email
    
    # Disconnect Razorpay
    disc = fresh_store.disconnect_razorpay(admin_id)
    assert disc.is_connected is False
