import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load backend/.env reliably regardless of working directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "RecoverAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Environment & Demo Mode
    IS_DEMO_MODE: bool = os.getenv("IS_DEMO_MODE", "true").lower() == "true"
    FRONTEND_PUBLIC_URL: str = os.getenv("FRONTEND_PUBLIC_URL", "https://share.google/IhXXtpGBbnNE8J5DV")
    
    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Razorpay Credentials
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mock_10293")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mock_secret_84920")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret")
    
    # EmailJS Configuration (Primary Transactional Provider)
    EMAILJS_SERVICE_ID: str = os.getenv("EMAILJS_SERVICE_ID", "")
    EMAILJS_TEMPLATE_ID: str = os.getenv("EMAILJS_TEMPLATE_ID", "")
    EMAILJS_TEMPLATE_PAYMENT_FAILED_ID: str = os.getenv("EMAILJS_TEMPLATE_PAYMENT_FAILED_ID", "")
    EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID: str = os.getenv("EMAILJS_TEMPLATE_RECOVERY_SUCCESS_ID", "")
    EMAILJS_TEMPLATE_ACTION_REQUIRED_ID: str = os.getenv("EMAILJS_TEMPLATE_ACTION_REQUIRED_ID", "")
    EMAILJS_TEMPLATE_ADMIN_NOTICE_ID: str = os.getenv("EMAILJS_TEMPLATE_ADMIN_NOTICE_ID", "")
    EMAILJS_PUBLIC_KEY: str = os.getenv("EMAILJS_PUBLIC_KEY", "")
    EMAILJS_PRIVATE_KEY: str = os.getenv("EMAILJS_PRIVATE_KEY", "")
    
    # Gmail / Brevo SMTP & HTTPS Relay Configuration
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    GMAIL_SMTP_HOST: str = os.getenv("GMAIL_SMTP_HOST", "smtp.gmail.com")
    GMAIL_SMTP_PORT: int = int(os.getenv("GMAIL_SMTP_PORT", "587"))
    GMAIL_SMTP_USER: str = os.getenv("GMAIL_SMTP_USER", "")
    GMAIL_SMTP_PASSWORD: str = os.getenv("GMAIL_SMTP_PASSWORD", "")
    GMAIL_SENDER_EMAIL: str = os.getenv("GMAIL_SENDER_EMAIL", "")
    GMAIL_SENDER_NAME: str = os.getenv("GMAIL_SENDER_NAME", "RecoverAI")
    
    # AI LLM Provider Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    
    # Merchant Recovery Default Policies
    DEFAULT_MAX_RETRIES: int = int(os.getenv("DEFAULT_MAX_RETRIES", "3"))
    DEFAULT_RETRY_WINDOW_HOURS: int = int(os.getenv("DEFAULT_RETRY_WINDOW_HOURS", "72"))
    DEFAULT_HIGH_VALUE_THRESHOLD: float = float(os.getenv("DEFAULT_HIGH_VALUE_THRESHOLD", "10000.0"))
    DEFAULT_HUMAN_REVIEW_CONFIDENCE_THRESHOLD: float = float(os.getenv("DEFAULT_HUMAN_REVIEW_CONFIDENCE_THRESHOLD", "0.60"))
    DEFAULT_DUNNING_ENABLED: bool = True

    # Celery & Redis Automation Architecture
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

settings = Settings()

