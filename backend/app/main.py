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
    description="RecoverAI — Autonomous AI Revenue Recovery Platform with Custom Authentication and Gmail SMTP Relay"
)

# Explicit allowed origins for CORS with credentials
ALLOWED_ORIGINS = [
    "https://razorpay-buildathon-ivory.vercel.app",
    "https://razorpay-buildathon.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

# Enable CORS with credentials support for frontend Vercel and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_PREFIX}/auth", tags=["Auth"])
app.include_router(assistant_router, prefix=f"{settings.API_PREFIX}/assistant", tags=["AI Assistant"])
app.include_router(razorpay_router, prefix=f"{settings.API_PREFIX}/razorpay", tags=["Razorpay Gateway"])
app.include_router(razorpay_router, prefix=f"{settings.API_PREFIX}/integrations/razorpay", tags=["Razorpay Integrations"])
app.include_router(communication_router, prefix=f"{settings.API_PREFIX}/recovery/email", tags=["Gmail SMTP Delivery"])
app.include_router(communication_router, prefix=f"{settings.API_PREFIX}/recovery", tags=["Recovery Emails"])
app.include_router(api_router, prefix=settings.API_PREFIX, tags=["Recovery Engine"])

# Direct top-level test email route: POST /api/email/test
@app.post(f"{settings.API_PREFIX}/email/test", response_model=TestEmailResponse, tags=["Gmail SMTP Delivery"])
async def top_level_test_email(payload: TestEmailRequest):
    return await test_email_endpoint(payload)

@app.get("/")
def root():
    return {
        "app": "RecoverAI",
        "tagline": "Recover revenue intelligently. Not blindly.",
        "ai_engines": ["Google Gemini (Platform Intelligence)", "Grok (Conversational Co-Pilot)"],
        "email_delivery": "Gmail SMTP Relay",
        "payment_gateway": "Razorpay Multi-Tenant OAuth",
        "auth_architecture": "Backend Session Authentication (Supabase PostgreSQL)",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
