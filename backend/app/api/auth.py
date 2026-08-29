import os
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends, Response, Request, Cookie, Query
from pydantic import BaseModel, EmailStr
from app.core.config import settings
from app.services.auth_service import auth_service, UserRecord, verify_password

router = APIRouter()

# ═════════════════════════════════════════════════════════════════════════
# ─── Request & Response Schemas ─────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

class AdminProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str = "ADMIN"
    is_demo: bool = False
    created_at: str
    email_verified: bool = True

class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class SignupResponse(BaseModel):
    success: bool
    message: str
    user: Dict[str, Any]
    needs_email_verification: bool = True

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: Dict[str, Any]

class VerifyEmailRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GenericAuthResponse(BaseModel):
    success: bool
    message: str

class MeResponse(BaseModel):
    authenticated: bool
    user: Dict[str, Any]

class AuthResponse(BaseModel):
    token: str
    admin: AdminProfile


# Default Demo Admin Profile for Hackathon Demo Workspace
DEMO_ADMIN = AdminProfile(
    id="admin_demo_001",
    email="demo@recoverai.ai",
    name="RecoverAI Demo Admin",
    role="ADMIN",
    is_demo=True,
    created_at="2026-01-01T00:00:00Z",
    email_verified=True
)

# Active Demo Session Tokens
ACTIVE_DEMO_TOKENS = {"token_demo_001", "demo_token"}


# ═════════════════════════════════════════════════════════════════════════
# ─── Authentication Dependency (Session Cookie & Bearer Token) ──────────
# ═════════════════════════════════════════════════════════════════════════

def get_current_admin(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_admin_id: Optional[str] = Header(None),
    recoverai_session: Optional[str] = Cookie(None)
) -> AdminProfile:
    """
    Dependency to enforce multi-tenant authentication via backend server-controlled session.
    Extracts session identity from:
    1. HTTP-Only Cookie ('recoverai_session')
    2. Authorization Header ('Bearer <session_token>')
    """
    session_token: Optional[str] = None

    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.split("Bearer ")[1].strip()
    elif recoverai_session:
        session_token = recoverai_session.strip()

    # 1. Handle Demo Mode and Demo Tokens
    if session_token and (
        session_token.startswith("token_demo_")
        or session_token in ACTIVE_DEMO_TOKENS
        or "demo" in session_token.lower()
        or session_token.startswith("mock_token")
    ):
        admin = DEMO_ADMIN
    elif session_token:
        # 2. Validate Session against AuthService
        user = auth_service.get_user_by_session(session_token)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session. Please log in again."
            )
        admin = AdminProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            is_demo=(user.id == DEMO_ADMIN.id),
            created_at=user.created_at,
            email_verified=user.email_verified
        )
    elif x_admin_id and x_admin_id == DEMO_ADMIN.id and settings.IS_DEMO_MODE:
        admin = DEMO_ADMIN
    elif settings.IS_DEMO_MODE and not authorization and not x_admin_id:
        admin = DEMO_ADMIN
    else:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to access this resource."
        )

    # 3. Tenant Isolation Guard: Reject identity mismatch
    if x_admin_id and x_admin_id != admin.id:
        raise HTTPException(
            status_code=403,
            detail="Tenant identity mismatch: X-Admin-Id does not match the authenticated session."
        )

    return admin


# ═════════════════════════════════════════════════════════════════════════
# ─── Auth Endpoints ─────────────────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════

@router.post("/signup", response_model=SignupResponse)
def signup(payload: SignupRequest):
    """
    Registers a new user account with secure password hashing (immediately active for login).
    """
    try:
        user, _ = auth_service.register_user(
            email=payload.email,
            password=payload.password,
            name=payload.name
        )
        return SignupResponse(
            success=True,
            message="Account successfully created. You can now log in.",
            user=user.to_safe_dict(),
            needs_email_verification=False
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to create account. Please try again.")


@router.get("/verify-email", response_model=GenericAuthResponse)
@router.post("/verify-email", response_model=GenericAuthResponse)
def verify_email(
    token: Optional[str] = Query(None),
    payload: Optional[VerifyEmailRequest] = None
):
    """
    Verifies a user's email address using the single-use verification token.
    """
    verification_token = token or (payload.token if payload else None)
    if not verification_token:
        raise HTTPException(status_code=400, detail="Verification token is required.")

    success, message, user = auth_service.verify_email_token(verification_token)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return GenericAuthResponse(
        success=True,
        message=message
    )


@router.post("/resend-verification", response_model=GenericAuthResponse)
def resend_verification(payload: ForgotPasswordRequest):
    """
    Resends verification email to the user if unverified.
    """
    auth_service.resend_verification_email(payload.email)
    return GenericAuthResponse(
        success=True,
        message="If an unverified account exists, a new verification link has been sent."
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, request: Request):
    """
    Authenticates user credentials, generates a server session, sets an HTTP-only cookie, and returns safe user profile.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        user, session_token = auth_service.authenticate_user(
            email=payload.email,
            password=payload.password,
            ip_address=client_ip,
            user_agent=user_agent
        )

        # Set secure HTTP-only session cookie (SameSite=None for cross-site Vercel <-> Render, or Lax)
        # Note: SameSite="none" requires secure=True in production
        is_secure = not settings.IS_DEMO_MODE or bool(os.getenv("RENDER") or os.getenv("VERCEL"))
        samesite = "none" if is_secure else "lax"

        response.set_cookie(
            key="recoverai_session",
            value=session_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=is_secure,
            samesite=samesite,
            path="/"
        )

        return LoginResponse(
            success=True,
            message="Logged in successfully.",
            token=session_token,
            user=user.to_safe_dict()
        )
    except ValueError as e:
        if getattr(e, "unverified", False):
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in."
            )
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Authentication failed. Please try again.")


@router.get("/me", response_model=MeResponse)
def get_me(admin: AdminProfile = Depends(get_current_admin)):
    """
    Returns the authenticated profile of the current session user.
    """
    return MeResponse(
        authenticated=True,
        user={
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
            "is_demo": admin.is_demo,
            "email_verified": admin.email_verified,
            "created_at": admin.created_at
        }
    )


@router.post("/logout", response_model=GenericAuthResponse)
def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    recoverai_session: Optional[str] = Cookie(None)
):
    """
    Invalidates the active session and clears the session cookie.
    """
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.split("Bearer ")[1].strip()
    elif recoverai_session:
        session_token = recoverai_session.strip()

    if session_token:
        auth_service.invalidate_session(session_token)
        ACTIVE_DEMO_TOKENS.discard(session_token)

    # Clear cookie
    is_secure = not settings.IS_DEMO_MODE or bool(os.getenv("RENDER") or os.getenv("VERCEL"))
    samesite = "none" if is_secure else "lax"
    response.delete_cookie(
        key="recoverai_session",
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        path="/"
    )

    return GenericAuthResponse(
        success=True,
        message="Logged out successfully."
    )


@router.post("/forgot-password", response_model=GenericAuthResponse)
def forgot_password(payload: ForgotPasswordRequest):
    """
    Requests a password reset link. Dispatches via EmailJS Password Reset template.
    """
    _, message, delivery = auth_service.request_password_reset(payload.email)
    
    # If dispatch explicitly failed (e.g. missing EmailJS configuration or provider rejection)
    if delivery.get("status") == "FAILED":
        err_msg = delivery.get("error") or "Failed to send password reset email. Please try again later."
        raise HTTPException(status_code=500, detail=err_msg)

    return GenericAuthResponse(
        success=True,
        message=message
    )


@router.post("/reset-password", response_model=GenericAuthResponse)
def reset_password(payload: ResetPasswordRequest):
    """
    Resets the account password using the single-use token and invalidates active sessions.
    """
    success, message = auth_service.reset_password(
        token=payload.token,
        new_password=payload.new_password
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return GenericAuthResponse(
        success=True,
        message=message
    )


@router.post("/demo", response_model=AuthResponse)
def login_demo_admin(response: Response):
    """
    1-Click instant login for Hackathon Judges into the pre-populated Demo Admin workspace.
    """
    token = f"token_demo_{uuid.uuid4().hex[:12]}"
    ACTIVE_DEMO_TOKENS.add(token)

    is_secure = not settings.IS_DEMO_MODE or bool(os.getenv("RENDER") or os.getenv("VERCEL"))
    samesite = "none" if is_secure else "lax"
    response.set_cookie(
        key="recoverai_session",
        value=token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        path="/"
    )

    return AuthResponse(token=token, admin=DEMO_ADMIN)
