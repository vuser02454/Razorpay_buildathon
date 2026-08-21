import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr

router = APIRouter()

class AdminProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str = "ADMIN"
    is_demo: bool = False
    created_at: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    admin: AdminProfile

# In-memory session and admin registry (Backed by Supabase store structure)
DEMO_ADMIN = AdminProfile(
    id="admin_demo_001",
    email="demo@recoverai.ai",
    name="RecoverAI Demo Admin",
    role="ADMIN",
    is_demo=True,
    created_at=datetime.now(timezone.utc).isoformat()
)

# Admin Registry
ADMIN_REGISTRY: Dict[str, AdminProfile] = {
    "admin_demo_001": DEMO_ADMIN,
    "demo@recoverai.ai": DEMO_ADMIN
}

# Passwords hash store (demo admin allows password 'demo123' or 1-click)
PASSWORD_STORE: Dict[str, str] = {
    "demo@recoverai.ai": hashlib.sha256("demo123".encode()).hexdigest()
}

# Active Token -> AdminProfile map
ACTIVE_SESSIONS: Dict[str, AdminProfile] = {
    "token_demo_001": DEMO_ADMIN
}

def get_current_admin(
    authorization: Optional[str] = Header(None),
    x_admin_id: Optional[str] = Header(None)
) -> AdminProfile:
    """Dependency to retrieve currently authenticated admin from Bearer token or X-Admin-Id."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        if token in ACTIVE_SESSIONS:
            return ACTIVE_SESSIONS[token]
            
    if x_admin_id and x_admin_id in ADMIN_REGISTRY:
        return ADMIN_REGISTRY[x_admin_id]

    # Default to Demo Admin in local demo development if no auth provided
    return DEMO_ADMIN

@router.post("/demo", response_model=AuthResponse)
def login_demo_admin():
    """1-Click instant login for Hackathon Judges into the pre-populated Demo Admin account."""
    token = f"token_demo_{uuid.uuid4().hex[:12]}"
    ACTIVE_SESSIONS[token] = DEMO_ADMIN
    return AuthResponse(token=token, admin=DEMO_ADMIN)

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email_clean = payload.email.strip().lower()
    
    # Check Demo Admin
    if email_clean == "demo@recoverai.ai":
        token = f"token_demo_{uuid.uuid4().hex[:12]}"
        ACTIVE_SESSIONS[token] = DEMO_ADMIN
        return AuthResponse(token=token, admin=DEMO_ADMIN)

    # Check Registered Admins
    if email_clean not in ADMIN_REGISTRY:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    pwd_hash = hashlib.sha256(payload.password.encode()).hexdigest()
    if PASSWORD_STORE.get(email_clean) != pwd_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    admin = ADMIN_REGISTRY[email_clean]
    token = f"token_usr_{uuid.uuid4().hex}"
    ACTIVE_SESSIONS[token] = admin
    return AuthResponse(token=token, admin=admin)

@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest):
    email_clean = payload.email.strip().lower()
    if email_clean in ADMIN_REGISTRY:
        raise HTTPException(status_code=400, detail="An admin with this email already exists.")
        
    admin_id = f"admin_{uuid.uuid4().hex[:10]}"
    new_admin = AdminProfile(
        id=admin_id,
        email=email_clean,
        name=payload.name.strip(),
        role="ADMIN",
        is_demo=False,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    ADMIN_REGISTRY[email_clean] = new_admin
    ADMIN_REGISTRY[admin_id] = new_admin
    PASSWORD_STORE[email_clean] = hashlib.sha256(payload.password.encode()).hexdigest()
    
    token = f"token_usr_{uuid.uuid4().hex}"
    ACTIVE_SESSIONS[token] = new_admin
    return AuthResponse(token=token, admin=new_admin)

@router.get("/me", response_model=AdminProfile)
def get_me(admin: AdminProfile = Depends(get_current_admin)):
    return admin

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        ACTIVE_SESSIONS.pop(token, None)
    return {"success": True, "message": "Logged out successfully"}
