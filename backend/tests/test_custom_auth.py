import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import (
    auth_service, hash_password, verify_password, UserRecord
)
from app.services.emailjs_provider import EmailJSProvider
from app.api.auth import DEMO_ADMIN


@pytest.fixture
def client():
    return TestClient(app)


# ═════════════════════════════════════════════════════════════════════════
# ─── 1. Password Hashing Tests ──────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_password_hashing_pbkdf2():
    """Verify passwords are securely hashed with PBKDF2 and never stored plaintext."""
    raw_pwd = "SuperSecretPassword123!"
    pwd_hash = hash_password(raw_pwd)

    assert pwd_hash.startswith("pbkdf2_sha256$100000$")
    assert raw_pwd not in pwd_hash
    assert verify_password(raw_pwd, pwd_hash) is True
    assert verify_password("WrongPassword!", pwd_hash) is False
    assert verify_password("", pwd_hash) is False


# ═════════════════════════════════════════════════════════════════════════
# ─── 2. Signup (Option A: No Verification Email Required) ───────────────
# ═════════════════════════════════════════════════════════════════════════

def test_signup_successful_and_immediately_usable(client):
    """
    Test 1: Successful signup creates an active, verified user without sending email verification.
    The account is immediately usable for authentication.
    """
    signup_email = "alex.turner@example.com"
    signup_name = "Alex Turner"
    signup_password = "Password2026!"

    with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
        response = client.post(
            "/api/auth/signup",
            json={
                "name": signup_name,
                "email": signup_email,
                "password": signup_password
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["needs_email_verification"] is False
        assert data["user"]["email"] == signup_email
        assert data["user"]["name"] == signup_name
        assert data["user"]["email_verified"] is True
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]

        # Option A invariant: EmailJS must NOT be called for verification during signup
        mock_emailjs.assert_not_called()

        # Immediate login works right away
        login_res = client.post(
            "/api/auth/login",
            json={"email": signup_email, "password": signup_password}
        )
        assert login_res.status_code == 200
        assert login_res.json()["success"] is True
        assert "token" in login_res.json()


def test_signup_duplicate_rejection(client):
    """Test 2: Duplicate email registration is rejected."""
    dup_email = "duplicate.user@example.com"
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


# ═════════════════════════════════════════════════════════════════════════
# ─── 3. Login & Session Management Tests ────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_login_successful_and_cookie_session(client):
    """Test 3: Successful login sets HTTP-only cookie and creates backend session."""
    login_email = "verified.login@example.com"
    user, _ = auth_service.register_user(email=login_email, password="MySecurePassword123!", name="Login User")

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
    """Test 4: Incorrect password fails with 401."""
    pwd_email = "wrong.pwd@example.com"
    auth_service.register_user(email=pwd_email, password="CorrectPassword123!", name="Pwd User")

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
    """Test 5: GET /api/auth/me returns authenticated user from session."""
    user_email = "session.me@example.com"
    auth_service.register_user(email=user_email, password="MePassword123!", name="Session Me")

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
    """Test 6: Unauthenticated /api/auth/me returns 401."""
    with patch("app.core.config.settings.IS_DEMO_MODE", False):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_nonexistent_token"})
        assert res.status_code == 401


def test_logout_invalidates_session(client):
    """Test 7: Logout destroys backend session."""
    user_email = "logout.test@example.com"
    auth_service.register_user(email=user_email, password="LogoutPassword123!", name="Logout User")

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
# ─── 5. Password Reset & EmailJS Integration Tests ──────────────────────
# ═════════════════════════════════════════════════════════════════════════

def test_forgot_password_privacy_non_revealing(client):
    """Test 8: Forgot-password returns constant-time generic message for non-existent emails."""
    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent.account@example.com"}
    )
    assert response.status_code == 200
    assert "If an account with this email exists" in response.json()["message"]


def test_emailjs_is_configured_checks_all_four_variables():
    """Test 9: Verify is_configured requires all 4 variables: service, public_key, private_key, template."""
    with patch.dict("os.environ", {
        "EMAILJS_SERVICE_ID": "service_test",
        "EMAILJS_PUBLIC_KEY": "public_test",
        "EMAILJS_PRIVATE_KEY": "private_test",
        "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_reset_test"
    }, clear=True):
        assert EmailJSProvider.is_configured() is True

    # Missing private_key -> False
    with patch.dict("os.environ", {
        "EMAILJS_SERVICE_ID": "service_test",
        "EMAILJS_PUBLIC_KEY": "public_test",
        "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_reset_test"
    }, clear=True):
        assert EmailJSProvider.is_configured() is False


def test_emailjs_get_template_id_for_password_reset():
    """Test 10: Verify get_template_id_for_type resolves to EMAILJS_TEMPLATE_PASSWORD_RESET_ID."""
    with patch.dict("os.environ", {
        "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_pwd_reset_exact_123"
    }, clear=True):
        res = EmailJSProvider.get_template_id_for_type("PASSWORD_RESET")
        assert res == "template_pwd_reset_exact_123"


def test_forgot_password_and_reset_flow(client):
    """
    Test 11: Password reset flow:
    - Calls EmailJS using EMAILJS_TEMPLATE_PASSWORD_RESET_ID
    - Sends to exact user.email
    - Canonical params: to_email, to_name, reset_link, subject
    - Updates password, invalidates old sessions and old password
    """
    reset_email = "reset.flow@example.com"
    user, _ = auth_service.register_user(email=reset_email, password="OldPassword123!", name="Reset User")

    # Initial login session
    login_res = auth_service.authenticate_user(email=reset_email, password="OldPassword123!")
    old_session = login_res[1]

    with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
        mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

        # Request reset
        res_req = client.post("/api/auth/forgot-password", json={"email": reset_email})
        assert res_req.status_code == 200

        # Verify recipient was reset_email and canonical variables
        mock_emailjs.assert_called_once()
        called_args = mock_emailjs.call_args[1]
        assert called_args["to_email"] == reset_email
        assert called_args["template_params"]["to_email"] == reset_email
        assert called_args["template_params"]["to_name"] == "Reset User"
        assert "reset_link" in called_args["template_params"]
        assert "verification_link" not in called_args["template_params"]
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


def test_emailjs_live_http_200_success(client):
    """Test 12: Live EmailJS call returning HTTP 200 dispatches cleanly."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "OK"

    user_email = "live.emailjs.success@example.com"
    auth_service.register_user(email=user_email, password="Password123!", name="Live User")

    mock_client_instance = MagicMock()
    mock_client_instance.__enter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_resp

    with patch("app.services.emailjs_provider.httpx.Client", return_value=mock_client_instance):
        with patch.dict("os.environ", {
            "EMAILJS_SERVICE_ID": "service_11cw53d",
            "EMAILJS_PUBLIC_KEY": "pub_key_mock",
            "EMAILJS_PRIVATE_KEY": "priv_key_mock",
            "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_reset_live"
        }):
            res = client.post("/api/auth/forgot-password", json={"email": user_email})
            assert res.status_code == 200
            assert mock_client_instance.post.called

            # Check payload
            call_kwargs = mock_client_instance.post.call_args[1]
            payload = call_kwargs["json"]
            assert payload["service_id"] == "service_11cw53d"
            assert payload["template_id"] == "template_reset_live"
            assert payload["user_id"] == "pub_key_mock"
            assert payload["accessToken"] == "priv_key_mock"
            assert payload["template_params"]["to_email"] == user_email
            assert payload["template_params"]["subject"] == "⚡ Reset your RecoverAI Password"


def test_emailjs_live_http_400_or_403_fails_endpoint(client):
    """Test 13: Live EmailJS call returning HTTP 400/403 causes /forgot-password to fail with 500."""
    mock_resp = MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = "Invalid user_id parameter"

    fail_email = "fail.emailjs@example.com"
    auth_service.register_user(email=fail_email, password="Password123!", name="Fail User")

    mock_client_instance = MagicMock()
    mock_client_instance.__enter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_resp

    with patch("app.services.emailjs_provider.httpx.Client", return_value=mock_client_instance):
        with patch.dict("os.environ", {
            "EMAILJS_SERVICE_ID": "service_11cw53d",
            "EMAILJS_PUBLIC_KEY": "pub_key_mock",
            "EMAILJS_PRIVATE_KEY": "priv_key_mock",
            "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_reset_live"
        }):
            res = client.post("/api/auth/forgot-password", json={"email": fail_email})
            assert res.status_code == 500
            assert "We couldn't send your email right now" in res.json()["detail"]


def test_missing_emailjs_env_var_in_production_fails_truthfully(client):
    """Test 14: In production deployment (e.g. Render), missing service ID or template ID fails truthfully."""
    render_email = "render.missing.key@example.com"
    auth_service.register_user(email=render_email, password="Password123!", name="Render User")

    with patch.dict("os.environ", {
        "RENDER": "true",
        "EMAILJS_SERVICE_ID": "", # Missing service ID
        "EMAILJS_PUBLIC_KEY": "pub_key_mock",
        "EMAILJS_TEMPLATE_PASSWORD_RESET_ID": "template_reset_live",
        "EMAILJS_PRIVATE_KEY": "priv_key_mock"
    }, clear=True):
        res = client.post("/api/auth/forgot-password", json={"email": render_email})
        assert res.status_code == 500
        assert "We couldn't send your email right now" in res.json()["detail"]


def test_used_reset_token_cannot_be_reused(client):
    """Test 15: Used reset token cannot be reused."""
    re_email = "reuse.token@example.com"
    auth_service.register_user(email=re_email, password="OldPassword123!", name="Re User")

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
    """Test 16: Verify enterprise@corp.in and admin email never leak as fallback in password reset."""
    custom_email = "target.user.exclusive@gmail.com"
    auth_service.register_user(email=custom_email, password="Password123!", name="Custom User")

    with patch("app.services.emailjs_provider.EmailJSProvider.send_transactional") as mock_emailjs:
        mock_emailjs.return_value = {"success": True, "provider": "emailjs", "status": "SENT"}

        client.post("/api/auth/forgot-password", json={"email": custom_email})

        mock_emailjs.assert_called_once()
        called_args = mock_emailjs.call_args[1]
        assert called_args["to_email"] == custom_email
        assert called_args["to_email"] != "enterprise@corp.in"
        assert called_args["to_email"] != "demo@recoverai.ai"


def test_demo_login_endpoint(client):
    """Test 17: 1-Click Demo Login endpoint returns demo session."""
    res = client.post("/api/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["admin"]["id"] == DEMO_ADMIN.id
    assert data["admin"]["email"] == DEMO_ADMIN.email
    assert "token" in data


def test_supabase_auth_never_called_during_custom_auth(client):
    """Test 18: Verify Supabase Auth SDK is never invoked during any auth operations."""
    with patch("supabase.client.Client.auth", create=True) as mock_sb_auth:
        # 1. Signup
        signup_res = client.post(
            "/api/auth/signup",
            json={"name": "No Supabase Auth", "email": "nosbauth@example.com", "password": "Password123!"}
        )
        assert signup_res.status_code == 200

        # 2. Login (instant, without verification)
        login_res = client.post(
            "/api/auth/login",
            json={"email": "nosbauth@example.com", "password": "Password123!"}
        )
        assert login_res.status_code == 200

        # 3. Forgot password & Reset password
        client.post("/api/auth/forgot-password", json={"email": "nosbauth@example.com"})
        reset_token = [tok for tok, t in auth_service._reset_tokens.items() if t["email"] == "nosbauth@example.com"][0]
        reset_res = client.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "NewPassword123!"})
        assert reset_res.status_code == 200

        # Assert no Supabase Auth methods were called
        mock_sb_auth.sign_up.assert_not_called()
        mock_sb_auth.sign_in_with_password.assert_not_called()
        mock_sb_auth.reset_password_for_email.assert_not_called()
        mock_sb_auth.update_user.assert_not_called()


def test_emailjs_private_key_never_exposed_in_client_responses(client):
    """Test 19: Verify private keys, secrets, and password hashes never leak in client responses."""
    with patch.dict("os.environ", {"EMAILJS_PRIVATE_KEY": "super_secret_private_emailjs_key"}):
        res_signup = client.post(
            "/api/auth/signup",
            json={"name": "Leak Test", "email": "leaktest@example.com", "password": "Password123!"}
        )
        body = res_signup.text
        assert "super_secret_private_emailjs_key" not in body
        assert "password_hash" not in body
        assert "pbkdf2" not in body
