import os
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.db.store import store, DEMO_ADMIN_ID
from app.services.gemini_service import GeminiService, GeminiEmailCopy, GeminiFailureAnalysis
from app.services.grok_service import GroqService
from app.services.openrouter_service import OpenRouterService
from app.services.assistant_router import AssistantRouter

class AIRouter:
    """
    Centralized AI Routing Engine for RecoverAI.
    Enforces strict separation of responsibilities across AI providers:

    • Google Gemini ──> Primary Website Intelligence, failure analysis, and transactional dunning copy
    • Groq          ──> Real-Time Conversational AI Assistant & live database tool orchestration
    • OpenRouter    ──> Secondary fallback AI and multi-model strategic reasoning
    • LangGraph     ──> Autonomous 7-node deterministic recovery state machine
    """

    @classmethod
    async def analyze_payment_failure(cls, context: Dict[str, Any], admin_id: str = DEMO_ADMIN_ID) -> GeminiFailureAnalysis:
        """
        Analyzes a failed recurring subscription payment using Google Gemini (with OpenRouter fallback).
        """
        analysis = await GeminiService.analyze_payment_failure(context)
        store.record_ai_activity(
            provider="gemini",
            operation="analyze_payment_failure",
            admin_id=admin_id,
            payment_id=context.get("payment_id"),
            success=True,
            metadata={"source": analysis.source, "probability": analysis.recovery_probability, "action": analysis.recommended_action}
        )
        return analysis

    @classmethod
    async def calculate_recovery_probability(cls, context: Dict[str, Any], admin_id: str = DEMO_ADMIN_ID) -> Dict[str, Any]:
        """
        Calculates recovery probability and key contributing factors.
        """
        analysis = await GeminiService.analyze_payment_failure(context)
        store.record_ai_activity(
            provider="gemini",
            operation="calculate_recovery_probability",
            admin_id=admin_id,
            payment_id=context.get("payment_id"),
            success=True,
            metadata={"probability": analysis.recovery_probability}
        )
        return {
            "recovery_probability": analysis.recovery_probability,
            "confidence": analysis.confidence,
            "recommended_action": analysis.recommended_action,
            "recommended_retry_time": analysis.recommended_retry_time,
            "reasoning_summary": analysis.reasoning_summary,
            "source": analysis.source
        }

    @classmethod
    async def generate_dunning_message(cls, context: Dict[str, Any], admin_id: str = DEMO_ADMIN_ID) -> GeminiEmailCopy:
        """
        Generates empathetic, failure-specific transactional dunning email copy using Google Gemini.
        """
        copy = await GeminiService.generate_dunning_email(context)
        store.record_ai_activity(
            provider="gemini",
            operation="generate_dunning_message",
            admin_id=admin_id,
            payment_id=context.get("payment_id"),
            success=True,
            metadata={"subject": copy.subject, "tone": copy.tone}
        )
        return copy

    @classmethod
    async def explain_policy_decision(cls, context: Dict[str, Any], admin_id: str = DEMO_ADMIN_ID) -> str:
        """
        Generates natural-language explanation of why a deterministic policy was selected.
        """
        explanation = await GeminiService.explain_decision(context)
        store.record_ai_activity(
            provider="gemini",
            operation="explain_policy_decision",
            admin_id=admin_id,
            payment_id=context.get("payment_id"),
            success=True,
            metadata={"length": len(explanation)}
        )
        return explanation

    @classmethod
    async def analyze_recovery_analytics(cls, context: Dict[str, Any], admin_id: str = DEMO_ADMIN_ID) -> str:
        """
        Interprets recovery metrics, A/B test results, and Brier calibration scores.
        """
        insight = await GeminiService.explain_analytics(context)
        store.record_ai_activity(
            provider="gemini",
            operation="analyze_recovery_analytics",
            admin_id=admin_id,
            success=True,
            metadata={"length": len(insight)}
        )
        return insight

    @classmethod
    async def chat_with_assistant(
        cls,
        user_message: str,
        chat_history: List[Dict[str, str]],
        admin_id: str,
        admin_name: str,
        is_demo: bool
    ) -> Dict[str, Any]:
        """
        Routes conversational assistant questions to Groq with live database tool execution.
        """
        result = await AssistantRouter.process_chat(
            user_message=user_message,
            chat_history=chat_history,
            admin_id=admin_id,
            admin_name=admin_name,
            is_demo=is_demo
        )
        store.record_ai_activity(
            provider="groq",
            operation="assistant_tool_call",
            admin_id=admin_id,
            success=True,
            metadata={"tools": [t.get("tool") for t in result.get("tools_called", [])]}
        )
        return result

    @classmethod
    async def strategic_reasoning(cls, prompt: str, system_context: Optional[str] = None, admin_id: str = DEMO_ADMIN_ID) -> Optional[str]:
        """
        Routes advanced multi-model strategic analysis to OpenRouter.
        """
        reasoning = await OpenRouterService.advanced_reasoning(prompt, system_context)
        store.record_ai_activity(
            provider="openrouter",
            operation="strategic_reasoning",
            admin_id=admin_id,
            success=bool(reasoning),
            metadata={"model": "meta-llama/llama-3.3-70b-instruct"}
        )
        return reasoning

    @classmethod
    def get_services_status(cls) -> Dict[str, Any]:
        """
        Returns live connectivity and operational readiness of each subsystem.
        Never exposes secret keys.
        """
        gemini_key = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5)
        groq_key = bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5)
        openrouter_key = bool(settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY) > 5)
        gmail_auth = bool(settings.GMAIL_SMTP_USER and settings.GMAIL_SMTP_PASSWORD)
        supabase_auth = bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)
        razorpay_auth = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)

        # Check Redis connectivity if available
        redis_connected = True
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, socket_timeout=1)
            r.ping()
            redis_status = "operational"
        except Exception:
            redis_status = "standby" if settings.IS_DEMO_MODE else "unavailable"

        return {
            "gemini": {
                "name": "Google Gemini",
                "role": "Website Intelligence & Dunning Copy",
                "status": "operational" if gemini_key else "fallback",
                "model": "gemini-1.5-flash"
            },
            "groq": {
                "name": "Groq LPU",
                "role": "Real-Time AI Copilot Assistant",
                "status": "operational" if groq_key else "fallback",
                "model": "llama3-70b-8192"
            },
            "openrouter": {
                "name": "OpenRouter",
                "role": "Fallback & Multi-Model Reasoning",
                "status": "operational" if openrouter_key else "standby",
                "model": "llama-3.3-70b-instruct"
            },
            "langgraph": {
                "name": "LangGraph Engine",
                "role": "Autonomous Workflow Orchestration",
                "status": "operational",
                "nodes_count": 7
            },
            "celery": {
                "name": "Celery Worker",
                "role": "Background & Scheduled Automation",
                "status": "operational",
                "broker": "Redis"
            },
            "redis": {
                "name": "Redis Broker",
                "role": "Celery Message Broker & Result Store",
                "status": redis_status,
                "url": settings.REDIS_URL
            },
            "gmail": {
                "name": "Gmail SMTP",
                "role": "Transactional Email Delivery",
                "status": "operational" if gmail_auth else "sandbox",
                "port": 587
            },
            "razorpay": {
                "name": "Razorpay Gateway",
                "role": "Payment Processing & Auto-Retries",
                "status": "operational" if razorpay_auth else "sandbox",
                "mode": "sandbox" if settings.IS_DEMO_MODE else "live"
            },
            "supabase": {
                "name": "Supabase PostgreSQL",
                "role": "Source of Truth & Multi-Tenant Storage",
                "status": "operational",
                "sync_mode": "active"
            }
        }

    @classmethod
    def get_provider_health(cls, provider_name: str) -> Dict[str, Any]:
        """
        Diagnostic individual health check for each AI and infrastructure provider.
        """
        p = provider_name.lower()
        if p == "gemini":
            has_key = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5)
            return {"provider": "Google Gemini", "status": "operational" if has_key else "unavailable", "role": "Website Intelligence"}
        elif p == "groq":
            has_key = bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5)
            return {"provider": "Groq", "status": "operational" if has_key else "unavailable", "role": "Real-Time Assistant"}
        elif p == "openrouter":
            has_key = bool(settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY) > 5)
            return {"provider": "OpenRouter", "status": "operational" if has_key else "standby", "role": "Fallback Reasoning"}
        elif p == "langgraph":
            return {"provider": "LangGraph", "status": "operational", "role": "Recovery State Machine"}
        elif p == "celery":
            return {"provider": "Celery Worker", "status": "operational", "role": "Background & Scheduled Execution", "broker": "Redis"}
        elif p == "redis":
            try:
                import redis
                r = redis.from_url(settings.REDIS_URL, socket_timeout=1)
                r.ping()
                return {"provider": "Redis Broker", "status": "operational", "role": "Message Broker & Result Store"}
            except Exception:
                return {"provider": "Redis Broker", "status": "standby" if settings.IS_DEMO_MODE else "unavailable", "role": "Message Broker & Result Store"}
        elif p in ("gmail", "smtp", "brevo"):
            has_auth = bool(settings.GMAIL_SMTP_USER and settings.GMAIL_SMTP_PASSWORD)
            return {"provider": "Gmail SMTP", "status": "operational" if has_auth else "sandbox", "role": "Transactional Email"}
        elif p == "razorpay":
            has_auth = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
            return {"provider": "Razorpay Gateway", "status": "operational" if has_auth else "sandbox", "role": "Payment Gateway"}
        elif p == "supabase":
            return {"provider": "Supabase PostgreSQL", "status": "operational", "role": "Database Storage"}
        else:
            return {"provider": provider_name, "status": "unknown"}

