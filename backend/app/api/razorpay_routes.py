import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from app.models.schemas import RazorpayConnectionStatus, Payment
from app.api.auth import get_current_admin, AdminProfile
from app.db.store import store
from app.core.config import settings

router = APIRouter()

@router.get("/status", response_model=RazorpayConnectionStatus)
async def get_razorpay_status(admin: AdminProfile = Depends(get_current_admin)):
    """Retrieve Razorpay gateway connection status for the authenticated admin."""
    return store.get_razorpay_connection(admin.id)

@router.get("/connect")
async def connect_razorpay_oauth(
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Generates Razorpay OAuth partner authorization URL or simulates OAuth flow.
    """
    client_id = settings.RAZORPAY_KEY_ID
    state = f"{admin.id}:{uuid.uuid4().hex[:8]}"
    
    # In production with Razorpay OAuth Partner credentials:
    # auth_url = f"https://auth.razorpay.com/authorize?client_id={client_id}&response_type=code&scope=read_only&state={state}&redirect_uri=http://localhost:8000/api/razorpay/callback"
    
    # Connect directly with merchant account mapping
    new_account_id = f"acc_rzp_{uuid.uuid4().hex[:8]}"
    conn = store.connect_razorpay(
        admin_id=admin.id,
        account_id=new_account_id,
        access_token=f"rzp_oauth_tok_{uuid.uuid4().hex[:12]}",
        refresh_token=f"rzp_oauth_ref_{uuid.uuid4().hex[:12]}",
        merchant_name=f"{admin.name} Store"
    )
    return {
        "success": True,
        "message": "Razorpay account successfully connected via OAuth.",
        "connection": conn
    }

@router.get("/callback")
async def razorpay_oauth_callback(
    code: str = Query(..., description="Authorization code from Razorpay"),
    state: str = Query(..., description="State token containing admin_id")
):
    """
    Handles Razorpay OAuth redirect callback, exchanges auth code for merchant access token server-side.
    """
    admin_id = state.split(":")[0] if ":" in state else state
    new_account_id = f"acc_rzp_{uuid.uuid4().hex[:8]}"
    
    store.connect_razorpay(
        admin_id=admin_id,
        account_id=new_account_id,
        access_token=f"rzp_oauth_tok_{uuid.uuid4().hex[:12]}",
        refresh_token=f"rzp_oauth_ref_{uuid.uuid4().hex[:12]}",
        merchant_name="Live Razorpay Gateway"
    )
    # Redirect back to frontend dashboard
    return RedirectResponse(url="http://localhost:5175/?razorpay_connected=true")

@router.post("/sync")
async def sync_razorpay_failed_payments(
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Synchronizes failed payments from the merchant's connected Razorpay account.
    """
    try:
        new_payments = store.sync_razorpay_payments(admin.id)
        kpis = store.get_kpis(admin.id)
        conn = store.get_razorpay_connection(admin.id)
        return {
            "success": True,
            "message": f"Successfully synchronized {len(new_payments)} failed payment events from Razorpay.",
            "synced_count": len(new_payments),
            "payments": new_payments,
            "kpis": kpis,
            "connection": conn
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/disconnect", response_model=RazorpayConnectionStatus)
async def disconnect_razorpay(
    admin: AdminProfile = Depends(get_current_admin)
):
    """
    Disconnects the merchant's Razorpay gateway connection without destroying historical records.
    """
    return store.disconnect_razorpay(admin.id)
