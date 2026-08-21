import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api.auth import router as auth_router
from app.api.assistant import router as assistant_router
from app.api.razorpay_routes import router as razorpay_router
from app.api.communication_routes import router as communication_router, test_email_endpoint
from app.models.schemas import TestEmailRequest, TestEmailResponse
from app.core.config import settings

app = FastAPI(
    title="RecoverAI Platform",
    version=settings.VERSION,
    description="RecoverAI — Autonomous AI Revenue Recovery Platform with Brevo SMTP Relay"
)

# Enable CORS for frontend Vite dev server (port 5173, 5175, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_PREFIX}/auth", tags=["Auth"])
app.include_router(assistant_router, prefix=f"{settings.API_PREFIX}/assistant", tags=["AI Assistant"])
app.include_router(razorpay_router, prefix=f"{settings.API_PREFIX}/razorpay", tags=["Razorpay Gateway"])
app.include_router(communication_router, prefix=f"{settings.API_PREFIX}/recovery/email", tags=["Brevo SMTP Delivery"])
app.include_router(api_router, prefix=settings.API_PREFIX, tags=["Recovery Engine"])

# Direct top-level test email route: POST /api/email/test
@app.post(f"{settings.API_PREFIX}/email/test", response_model=TestEmailResponse, tags=["Brevo SMTP Delivery"])
async def top_level_test_email(payload: TestEmailRequest):
    return await test_email_endpoint(payload)

@app.get("/")
def root():
    return {
        "app": "RecoverAI",
        "tagline": "Recover revenue intelligently. Not blindly.",
        "ai_engines": ["Google Gemini (Platform Intelligence)", "Grok (Conversational Co-Pilot)"],
        "email_delivery": "Brevo SMTP Relay",
        "payment_gateway": "Razorpay Multi-Tenant OAuth",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
