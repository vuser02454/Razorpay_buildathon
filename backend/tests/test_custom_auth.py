import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import (
    auth_service, hash_password, verify_password, UserRecord
)
from app.api.auth import DEMO_ADMIN


@pytest.fixture
def client():
    return TestClient(app)


# ═════════════════════════════════════════════════════════════════════════
# ─── 1. Password Hashing Tests ──────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_password_hashing_pbkdf2():
    """Verify passwords are securely hashed and never stored plaintext."""
    raw_pwd = "SuperSecretPassword123!"
    pwd_hash = hash_password(raw_pwd)

    assert pwd_hash.startswith("pbkdf2_sha256$100000$")
    assert raw_pwd not in pwd_hash
    assert verify_password(raw_pwd, pwd_hash) is True
    assert verify_password("WrongPassword!", pwd_hash) is False
    assert verify_password("", pwd_hash) is False


# ═════════════════════════════════════════════════════════════════════════
# ─── 2. Signup & Email Verification Tests ────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_signup_successful(client):
    """Test 1 & 4: Successful signup creates unverified user and sends verification email."""
    signup_email = "alex.turner@example.com"
    signup_name = "Alex Turner"

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

            response = client.post(
                "/api/auth/signup",
                json={
                    "name": signup_name,
                    "email": signup_email,
                    "password": "Password2026!"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["needs_email_verification"] is True
            assert data["user"]["email"] == signup_email
            assert data["user"]["name"] == signup_name
            assert data["user"]["email_verified"] is False
            assert "password" not in data["user"]
            assert "password_hash" not in data["user"]

            # Verify EmailJS received exact user email
            mock_emailjs.assert_called_once()
            called_args = mock_emailjs.call_args[1]
            assert called_args["to_email"] == signup_email
            assert called_args["template_params"]["to_email"] == signup_email
            assert called_args["template_params"]["email"] == signup_email
            assert "verification_link" in called_args["template_params"]
            assert "token=" in called_args["template_params"]["verification_link"]


def test_signup_duplicate_rejection(client):
    """Test 2: Duplicate email registration is rejected."""
    dup_email = "duplicate.user@example.com"
    # First signup
    auth_service.register_user(email=dup_email, password="InitialPassword123!", name="First User")

    # Second signup attempt
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Second User",
            "email": dup_email,
            "password": "SecondPassword123!"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_verification_token_works_and_single_use(client):
    """Test 5 & 7: Verification token marks account verified, then cannot be reused."""
    test_email = "verify.flow@example.com"
    user, token = auth_service.register_user(email=test_email, password="ValidPassword123!", name="Verify User")
    assert user.email_verified is False

    # 1. Use token via GET
    res_get = client.get(f"/api/auth/verify-email?token={token}")
    assert res_get.status_code == 200
    assert res_get.json()["success"] is True

    # User is now verified
    assert user.email_verified is True

    # 2. Reuse token -> should fail
    res_reuse = client.post("/api/auth/verify-email", json={"token": token})
    assert res_reuse.status_code == 400
    assert "already been used" in res_reuse.json()["detail"]


def test_expired_verification_token_fails(client):
    """Test 6: Expired verification token is rejected."""
    test_email = "expired.verify@example.com"
    user, token = auth_service.register_user(email=test_email, password="ValidPassword123!", name="Expired User")

    # Force expiration 25 hours in the past
    past_time = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    auth_service._verification_tokens[token]["expires_at"] = past_time

    response = client.post("/api/auth/verify-email", json={"token": token})
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]
    assert user.email_verified is False


# ═════════════════════════════════════════════════════════════════════════
# ─── 3. Login & Session Management Tests ────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_login_unverified_account_blocked(client):
    """Test 10: Unverified account login is blocked with 403."""
    unverified_email = "unverified.login@example.com"
    auth_service.register_user(email=unverified_email, password="SecretPassword123!", name="Unverified User")

    response = client.post(
        "/api/auth/login",
        json={"email": unverified_email, "password": "SecretPassword123!"}
    )
    assert response.status_code == 403
    assert "verify your email" in response.json()["detail"].lower()


def test_login_successful_and_cookie_session(client):
    """Test 8 & 11: Successful login sets HTTP-only cookie and creates backend session."""
    login_email = "verified.login@example.com"
    user, token = auth_service.register_user(email=login_email, password="MySecurePassword123!", name="Login User")
    # Verify account
    auth_service.verify_email_token(token)

    response = client.post(
        "/api/auth/login",
        json={"email": login_email, "password": "MySecurePassword123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == login_email
    assert "token" in data
    assert "recoverai_session" in response.cookies


def test_login_incorrect_password_fails(client):
    """Test 9: Incorrect password fails with 401."""
    pwd_email = "wrong.pwd@example.com"
    user, token = auth_service.register_user(email=pwd_email, password="CorrectPassword123!", name="Pwd User")
    auth_service.verify_email_token(token)

    response = client.post(
        "/api/auth/login",
        json={"email": pwd_email, "password": "IncorrectPassword!"}
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


# ═════════════════════════════════════════════════════════════════════════
# ─── 4. Current User (/api/auth/me) & Logout Tests ──────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_get_me_with_valid_session(client):
    """Test 12: GET /api/auth/me returns authenticated user from session."""
    user_email = "session.me@example.com"
    user, token = auth_service.register_user(email=user_email, password="MePassword123!", name="Session Me")
    auth_service.verify_email_token(token)

    # Login to get session
    login_res = client.post("/api/auth/login", json={"email": user_email, "password": "MePassword123!"})
    session_token = login_res.json()["token"]

    # 1. Access with Bearer token
    res_bearer = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert res_bearer.status_code == 200
    data = res_bearer.json()
    assert data["authenticated"] is True
    assert data["user"]["email"] == user_email
    assert data["user"]["name"] == "Session Me"

    # 2. Access with Cookie
    res_cookie = client.get("/api/auth/me", cookies={"recoverai_session": session_token})
    assert res_cookie.status_code == 200
    assert res_cookie.json()["user"]["email"] == user_email


def test_get_me_unauthenticated_returns_401(client):
    """Test 13: Unauthenticated /api/auth/me returns 401."""
    # When IS_DEMO_MODE is disabled or invalid token provided
    with patch("app.core.config.settings.IS_DEMO_MODE", False):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_nonexistent_token"})
        assert res.status_code == 401


def test_logout_invalidates_session(client):
    """Test 14: Logout destroys backend session."""
    user_email = "logout.test@example.com"
    user, token = auth_service.register_user(email=user_email, password="LogoutPassword123!", name="Logout User")
    auth_service.verify_email_token(token)

    login_res = client.post("/api/auth/login", json={"email": user_email, "password": "LogoutPassword123!"})
    session_token = login_res.json()["token"]

    # Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {session_token}"})
    assert logout_res.status_code == 200

    # Verify session is destroyed
    with patch("app.core.config.settings.IS_DEMO_MODE", False):
        me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
        assert me_res.status_code == 401


# ═════════════════════════════════════════════════════════════════════════
# ─── 5. Password Reset Tests ────────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_forgot_password_privacy_non_revealing(client):
    """Test 15: Forgot-password returns constant-time generic message for non-existent emails."""
    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent.account@example.com"}
    )
    assert response.status_code == 200
    assert "If an account with this email exists" in response.json()["message"]


def test_forgot_password_and_reset_flow(client):
    """Test 16, 17, 20 & 21: Reset email dispatches, token updates password, old password fails, sessions invalidated."""
    reset_email = "reset.flow@example.com"
    user, token = auth_service.register_user(email=reset_email, password="OldPassword123!", name="Reset User")
    auth_service.verify_email_token(token)

    # Initial login session
    login_res = auth_service.authenticate_user(email=reset_email, password="OldPassword123!")
    old_session = login_res[1]

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

            # Request reset
            res_req = client.post("/api/auth/forgot-password", json={"email": reset_email})
            assert res_req.status_code == 200

            # Verify recipient was reset_email
            mock_emailjs.assert_called_once()
            called_args = mock_emailjs.call_args[1]
            assert called_args["to_email"] == reset_email
            assert "reset-password?token=" in called_args["template_params"]["reset_link"]

    # Extract reset token from store
    active_reset_tokens = [tok for tok, t in auth_service._reset_tokens.items() if t["email"] == reset_email and not t["used"]]
    assert len(active_reset_tokens) == 1
    reset_token = active_reset_tokens[0]

    # Reset password
    res_reset = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "new_password": "NewSuperPassword2026!"}
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["success"] is True

    # 1. Old password fails
    with pytest.raises(ValueError):
        auth_service.authenticate_user(email=reset_email, password="OldPassword123!")

    # 2. Old session invalidated
    assert auth_service.get_user_by_session(old_session) is None

    # 3. New password succeeds
    user_auth, new_session = auth_service.authenticate_user(email=reset_email, password="NewSuperPassword2026!")
    assert user_auth.email == reset_email
    assert new_session is not None


def test_used_reset_token_cannot_be_reused(client):
    """Test 19: Used reset token cannot be reused."""
    re_email = "reuse.token@example.com"
    user, token = auth_service.register_user(email=re_email, password="OldPassword123!", name="Re User")
    auth_service.verify_email_token(token)

    auth_service.request_password_reset(re_email)
    active_reset_tokens = [tok for tok, t in auth_service._reset_tokens.items() if t["email"] == re_email and not t["used"]]
    reset_token = active_reset_tokens[0]

    # First reset
    client.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "NewPassword123!"})

    # Second reset attempt with same token
    res_second = client.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "AnotherPassword123!"})
    assert res_second.status_code == 400
    assert "already been used" in res_second.json()["detail"]


# ═════════════════════════════════════════════════════════════════════════
# ─── 6. Recipient Isolation & Security Invariants ───────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_enterprise_corp_in_never_used_in_auth(client):
    """Test 22 & 23: Verify enterprise@corp.in and admin email never leak as fallback in auth."""
    custom_email = "target.user.exclusive@gmail.com"

    with patch("app.services.emailjs_provider.EmailJSProvider.is_configured", return_value=True):
        with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
            mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

            client.post("/api/auth/signup", json={"email": custom_email, "password": "Password123!", "name": "Custom"})

            mock_emailjs.assert_called_once()
            called_args = mock_emailjs.call_args[1]
            assert called_args["to_email"] == custom_email
            assert called_args["to_email"] != "enterprise@corp.in"
            assert called_args["to_email"] != "demo@recoverai.ai"


def test_demo_login_endpoint(client):
    """Test 25: 1-Click Demo Login endpoint returns demo session."""
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["admin"]["id"] == DEMO_ADMIN.id
    assert data["admin"]["email"] == DEMO_ADMIN.email
    assert "token" in data
