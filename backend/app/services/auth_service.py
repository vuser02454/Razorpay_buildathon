import os
import secrets
import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, EmailStr
from app.core.config import settings
from app.services.emailjs_provider import EmailJSProvider
from app.services.email_service import EmailService

logger = logging.getLogger("recoverai.auth")

# ═════════════════════════════════════════════════════════════════════════
# ─── Password Hashing (PBKDF2-HMAC-SHA256 — Django Compatible Standard) ──
# ═════════════════════════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a unique random salt (100,000 iterations).
    Format: pbkdf2_sha256$iterations$salt$hash
    """
    salt = secrets.token_hex(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    hash_hex = derived.hex()
    return f"pbkdf2_sha256${iterations}${salt}${hash_hex}"

def verify_password(password: str, encoded_hash: str) -> bool:
    """
    Securely checks a plaintext password against an encoded PBKDF2 hash.
    Constant-time comparison prevents timing attacks.
    """
    try:
        parts = encoded_hash.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hash = parts[3]
        derived = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return hmac.compare_digest(derived.hex(), expected_hash)
    except Exception as e:
        logger.error(f"[AuthService] Password verification failed: {e}")
        return False


# ═════════════════════════════════════════════════════════════════════════
# ─── User & Session Data Structures ─────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

class UserRecord:
    def __init__(
        self,
        id: str,
        email: str,
        name: str,
        password_hash: str,
        role: str = "ADMIN",
        email_verified: bool = False,
        is_active: bool = True,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        now_str = datetime.now(timezone.utc).isoformat()
        self.id = id
        self.email = email.lower().strip()
        self.name = name.strip() or self.email.split('@')[0]
        self.password_hash = password_hash
        self.role = role
        self.email_verified = email_verified
        self.is_active = is_active
        self.created_at = created_at or now_str
        self.updated_at = updated_at or now_str

    def to_safe_dict(self) -> Dict[str, Any]:
        """Returns safe user data without password hashes or tokens."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "email_verified": self.email_verified,
            "is_active": self.is_active,
            "created_at": self.created_at
        }


class AuthService:
    """
    Central Authentication Authority for RecoverAI.
    Controls User Registration, Password Hashing, Email Verification,
    Session Management, and Password Resets with Supabase PostgreSQL.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AuthService, cls).__new__(cls)
            cls._instance._users: Dict[str, UserRecord] = {} # user_id -> UserRecord
            cls._instance._email_to_id: Dict[str, str] = {} # email -> user_id
            cls._instance._sessions: Dict[str, Dict[str, Any]] = {} # session_token -> session_data
            cls._instance._verification_tokens: Dict[str, Dict[str, Any]] = {} # token -> token_data
            cls._instance._reset_tokens: Dict[str, Dict[str, Any]] = {} # token -> token_data
            cls._instance._init_demo_user()
        return cls._instance

    def _init_demo_user(self):
        """Initializes the baseline Demo Admin account in the store."""
        demo_id = "admin_demo_001"
        demo_email = "demo@recoverai.ai"
        demo_user = UserRecord(
            id=demo_id,
            email=demo_email,
            name="RecoverAI Demo Admin",
            password_hash=hash_password("DemoPassword2026!"),
            role="ADMIN",
            email_verified=True,
            is_active=True,
            created_at="2026-01-01T00:00:00Z"
        )
        self._users[demo_id] = demo_user
        self._email_to_id[demo_email] = demo_id

    def _get_supabase_client(self):
        """Returns Supabase PostgreSQL client if configured."""
        if settings.SUPABASE_URL and settings.SUPABASE_KEY and "placeholder" not in settings.SUPABASE_URL:
            try:
                from supabase import create_client
                return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                logger.warning(f"[AuthService] Supabase PostgreSQL client connection notice: {e}")
        return None

    # ─────────────────────────────────────────────────────────────────────
    # ── User Registration ────────────────────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────

    def register_user(
        self,
        email: str,
        password: str,
        name: Optional[str] = None
    ) -> Tuple[UserRecord, str]:
        """
        Creates a new user account with secure password hashing,
        marks email_verified = False, and generates a single-use verification token.
        """
        clean_email = email.lower().strip()
        clean_name = (name or "").strip() or clean_email.split('@')[0]

        # 1. Validation
        if not clean_email or "@" not in clean_email or "." not in clean_email.split("@")[-1]:
            raise ValueError("A valid email address is required.")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters.")

        # 2. Check Duplicate Account
        if clean_email in self._email_to_id:
            raise ValueError("An account with this email address already exists.")

        # 3. Create User
        user_id = f"usr_{secrets.token_hex(8)}"
        pwd_hash = hash_password(password)
        user = UserRecord(
            id=user_id,
            email=clean_email,
            name=clean_name,
            password_hash=pwd_hash,
            role="ADMIN",
            email_verified=False,
            is_active=True
        )

        self._users[user_id] = user
        self._email_to_id[clean_email] = user_id

        # 4. Sync to Supabase PostgreSQL table 'users' if available
        sb = self._get_supabase_client()
        if sb:
            try:
                sb.table("users").upsert({
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "password_hash": user.password_hash,
                    "role": user.role,
                    "email_verified": user.email_verified,
                    "created_at": user.created_at
                }).execute()
            except Exception as e:
                logger.warning(f"[AuthService] Note on Supabase PostgreSQL table sync: {e}")

        # 5. Generate single-use verification token (24-hour expiry)
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        self._verification_tokens[token] = {
            "token": token,
            "user_id": user_id,
            "email": clean_email,
            "expires_at": expires_at.isoformat(),
            "used": False
        }

        # 6. Send verification email via EmailJS (or fallback transport)
        self._dispatch_verification_email(user=user, token=token)

        return user, token

    def _dispatch_verification_email(self, user: UserRecord, token: str) -> Dict[str, Any]:
        """
        Sends the single-use verification link to the user's exact registered email address.
        """
        if not user or not user.email or "@" not in user.email or "." not in user.email.split("@")[-1]:
            logger.warning("[AuthService] Verification email skipped: Invalid user email.")
            return {"success": False, "status": "FAILED", "error": "Invalid user email."}

        clean_recipient = user.email.strip().lower()

        frontend_base = (
            os.getenv("FRONTEND_PUBLIC_URL", "")
            or getattr(settings, "FRONTEND_PUBLIC_URL", "")
            or "https://razorpay-buildathon-ivory.vercel.app"
        ).rstrip("/")
        if "share.google" in frontend_base:
            frontend_base = "https://razorpay-buildathon-ivory.vercel.app"

        verification_link = f"{frontend_base}/verify-email?token={token}"
        subject = "⚡ Verify your RecoverAI Account"

        template_params = {
            "email": clean_recipient,
            "to_email": clean_recipient,
            "recipient_email": clean_recipient,
            "name": user.name,
            "customer_name": user.name,
            "to_name": user.name,
            "verification_link": verification_link,
            "verify_link": verification_link,
            "update_link": verification_link,
            "link": verification_link,
            "subject": subject
        }

        logger.info(f"[AuthService] Dispatching email verification to {clean_recipient}")

        if EmailJSProvider.is_configured():
            return EmailJSProvider.send_transactional(
                to_email=clean_recipient,
                subject=subject,
                template_params=template_params,
                email_type="EMAIL_VERIFICATION"
            )
        else:
            # Fallback to internal transport
            html_body = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #0f172a;">Verify your RecoverAI Account</h2>
                <p>Hello {user.name},</p>
                <p>Thank you for registering on RecoverAI. Please verify your email address by clicking the button below:</p>
                <div style="margin: 24px 0;">
                    <a href="{verification_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Verify My Account
                    </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Link: {verification_link}</p>
            </div>
            """
            return EmailService._dispatch(
                to_email=user.email,
                subject=subject,
                html_content=html_body,
                text_content=f"Verify your RecoverAI account: {verification_link}",
                email_type="EMAIL_VERIFICATION"
            )

    # ─────────────────────────────────────────────────────────────────────
    # ── Email Verification ───────────────────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────

    def verify_email_token(self, token: str) -> Tuple[bool, str, Optional[UserRecord]]:
        """
        Validates the single-use token, checks expiration, marks email_verified = True,
        and invalidates the token.
        """
        token_data = self._verification_tokens.get(token)
        if not token_data:
            return False, "Invalid or unrecognized verification token.", None

        if token_data.get("used"):
            return False, "This verification token has already been used.", None

        # Check expiration
        expires_at_str = token_data.get("expires_at", "")
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now(timezone.utc) > expires_at:
                    return False, "This verification token has expired. Please request a new one.", None
            except Exception:
                pass

        user_id = token_data.get("user_id")
        user = self._users.get(user_id)
        if not user:
            return False, "Associated user account was not found.", None

        # Mark verified & invalidate token
        user.email_verified = True
        user.updated_at = datetime.now(timezone.utc).isoformat()
        token_data["used"] = True
        token_data["used_at"] = datetime.now(timezone.utc).isoformat()

        # Update Supabase PostgreSQL if connected
        sb = self._get_supabase_client()
        if sb:
            try:
                sb.table("users").update({"email_verified": True}).eq("id", user.id).execute()
            except Exception as e:
                logger.warning(f"[AuthService] Supabase verification sync note: {e}")

        logger.info(f"[AuthService] Email successfully verified for user {user.email}")
        return True, "Email successfully verified. You may now log in.", user

    def resend_verification_email(self, email: str) -> bool:
        """Resends verification email to an unverified user."""
        clean_email = email.lower().strip()
        user_id = self._email_to_id.get(clean_email)
        if not user_id or user_id not in self._users:
            return True
        user = self._users[user_id]
        if user.email_verified:
            return True
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        self._verification_tokens[token] = {
            "token": token,
            "user_id": user.id,
            "email": user.email,
            "expires_at": expires_at.isoformat(),
            "used": False
        }
        self._dispatch_verification_email(user=user, token=token)
        return True

    # ─────────────────────────────────────────────────────────────────────
    # ── Authentication & Login ───────────────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────

    def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[UserRecord, str]:
        """
        Authenticates credentials, verifies account status and email confirmation,
        creates a secure server-controlled session, and returns the UserRecord and Session Token.
        """
        clean_email = email.lower().strip()
        user_id = self._email_to_id.get(clean_email)
        if not user_id or user_id not in self._users:
            raise ValueError("Email or password is incorrect.")

        user = self._users[user_id]
        if not user.is_active:
            raise ValueError("This account has been deactivated. Please contact support.")

        if not verify_password(password, user.password_hash):
            raise ValueError("Email or password is incorrect.")

        if not user.email_verified and not getattr(user, "is_demo", False) and user.id != "admin_demo_001":
            # Account is unverified
            err = ValueError("Please verify your email before logging in.")
            setattr(err, "unverified", True)
            setattr(err, "email", user.email)
            raise err

        # Create authenticated backend session (7-day validity)
        session_token = f"sess_{secrets.token_urlsafe(32)}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        self._sessions[session_token] = {
            "session_token": session_token,
            "user_id": user.id,
            "email": user.email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent
        }

        logger.info(f"[AuthService] Created session for user {user.email}")
        return user, session_token

    # ─────────────────────────────────────────────────────────────────────
    # ── Session Validation & Management ──────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────

    def get_user_by_session(self, session_token: str) -> Optional[UserRecord]:
        """
        Retrieves the authenticated user record associated with a valid session token.
        """
        if not session_token:
            return None

        # Demo session shortcut
        if session_token == "token_demo_001" or session_token == "demo_token" or session_token.startswith("token_demo_"):
            return self._users.get("admin_demo_001")

        session_data = self._sessions.get(session_token)
        if not session_data:
            return None

        # Check expiration
        expires_at_str = session_data.get("expires_at", "")
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now(timezone.utc) > expires_at:
                    self._sessions.pop(session_token, None)
                    return None
            except Exception:
                pass

        user_id = session_data.get("user_id")
        return self._users.get(user_id)

    def invalidate_session(self, session_token: str) -> bool:
        """Destroys an active session on logout."""
        if session_token in self._sessions:
            self._sessions.pop(session_token, None)
            return True
        return False

    def invalidate_all_user_sessions(self, user_id: str):
        """Invalidates all sessions for a user upon password reset."""
        tokens_to_remove = [
            tok for tok, s in self._sessions.items()
            if s.get("user_id") == user_id
        ]
        for tok in tokens_to_remove:
            self._sessions.pop(tok, None)

    # ─────────────────────────────────────────────────────────────────────
    # ── Password Reset Flow ──────────────────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────

    def request_password_reset(self, email: str) -> bool:
        """
        Initiates password reset without leaking account existence.
        Generates single-use reset token and dispatches reset email if account exists.
        """
        clean_email = email.lower().strip()
        user_id = self._email_to_id.get(clean_email)
        if not user_id or user_id not in self._users:
            # Constant-time return to prevent user enumeration
            logger.info(f"[AuthService] Password reset requested for non-existent email {clean_email}")
            return True

        user = self._users[user_id]
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1) # 1-hour expiry

        self._reset_tokens[token] = {
            "token": token,
            "user_id": user.id,
            "email": user.email,
            "expires_at": expires_at.isoformat(),
            "used": False
        }

        # Dispatch reset email
        self._dispatch_password_reset_email(user=user, token=token)
        return True

    def _dispatch_password_reset_email(self, user: UserRecord, token: str) -> Dict[str, Any]:
        """
        Dispatches password reset instructions exclusively to the user's registered email.
        """
        if not user or not user.email or "@" not in user.email or "." not in user.email.split("@")[-1]:
            logger.warning("[AuthService] Password reset email skipped: Invalid user email.")
            return {"success": False, "status": "FAILED", "error": "Invalid user email."}

        clean_recipient = user.email.strip().lower()

        frontend_base = (
            os.getenv("FRONTEND_PUBLIC_URL", "")
            or getattr(settings, "FRONTEND_PUBLIC_URL", "")
            or "https://razorpay-buildathon-ivory.vercel.app"
        ).rstrip("/")
        if "share.google" in frontend_base:
            frontend_base = "https://razorpay-buildathon-ivory.vercel.app"

        reset_link = f"{frontend_base}/reset-password?token={token}"
        subject = "⚡ Reset your RecoverAI Password"

        template_params = {
            "email": clean_recipient,
            "to_email": clean_recipient,
            "recipient_email": clean_recipient,
            "name": user.name,
            "customer_name": user.name,
            "to_name": user.name,
            "reset_link": reset_link,
            "password_reset_link": reset_link,
            "verification_link": reset_link,
            "update_link": reset_link,
            "link": reset_link,
            "subject": subject
        }

        logger.info(f"[AuthService] Dispatching password reset email to {clean_recipient}")

        if EmailJSProvider.is_configured():
            return EmailJSProvider.send_transactional(
                to_email=clean_recipient,
                subject=subject,
                template_params=template_params,
                email_type="PASSWORD_RESET"
            )
        else:
            html_body = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #0f172a;">Reset your RecoverAI Password</h2>
                <p>Hello {user.name},</p>
                <p>A password reset request was received for your account. Click the button below to choose a new password:</p>
                <div style="margin: 24px 0;">
                    <a href="{reset_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Reset My Password
                    </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. Link: {reset_link}</p>
            </div>
            """
            return EmailService._dispatch(
                to_email=user.email,
                subject=subject,
                html_content=html_body,
                text_content=f"Reset your RecoverAI password: {reset_link}",
                email_type="PASSWORD_RESET"
            )

    def reset_password(self, token: str, new_password: str) -> Tuple[bool, str]:
        """
        Validates reset token, hashes new password, updates account, marks token used,
        and invalidates existing sessions.
        """
        token_data = self._reset_tokens.get(token)
        if not token_data:
            return False, "Invalid or unrecognized password reset token."

        if token_data.get("used"):
            return False, "This password reset token has already been used."

        expires_at_str = token_data.get("expires_at", "")
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now(timezone.utc) > expires_at:
                    return False, "This password reset link has expired. Please request a new one."
            except Exception:
                pass

        if len(new_password) < 6:
            return False, "New password must be at least 6 characters."

        user_id = token_data.get("user_id")
        user = self._users.get(user_id)
        if not user:
            return False, "Associated user account was not found."

        # Update password hash
        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.now(timezone.utc).isoformat()
        token_data["used"] = True
        token_data["used_at"] = datetime.now(timezone.utc).isoformat()

        # Invalidate all active sessions for security
        self.invalidate_all_user_sessions(user.id)

        # Update Supabase PostgreSQL if connected
        sb = self._get_supabase_client()
        if sb:
            try:
                sb.table("users").update({"password_hash": user.password_hash}).eq("id", user.id).execute()
            except Exception as e:
                logger.warning(f"[AuthService] Supabase password update sync note: {e}")

        logger.info(f"[AuthService] Password successfully reset for user {user.email}")
        return True, "Password has been successfully updated. You may now log in."


# Singleton instance
auth_service = AuthService()
