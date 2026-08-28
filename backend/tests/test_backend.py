import pytest
import asyncio
from app.models.schemas import FailureType, RecoveryAction, PaymentStatus, EmailType
from app.agent.decision_engine import DecisionEngine
from app.agent.graph import recovery_graph_app
from app.db.store import store, DEMO_ADMIN_ID
from app.services.ai_router import AIRouter
from app.services.gemini_service import GeminiService
from app.services.grok_service import GroqService
from app.services.openrouter_service import OpenRouterService
from app.services.assistant_router import AssistantRouter
from app.services.email_service import EmailService

def test_failure_classification():
    assert DecisionEngine.classify_failure("insufficient_funds", "Declined due to low balance", False) == FailureType.SOFT_DECLINE
    assert DecisionEngine.classify_failure("card_expired", "Card is expired", True) == FailureType.CREDENTIAL_ISSUE
    assert DecisionEngine.classify_failure("stolen_card", "Card marked stolen", False) == FailureType.HARD_DECLINE
    assert DecisionEngine.classify_failure("bank_timeout", "Issuer switch timeout 504", False) == FailureType.NETWORK_TIMEOUT
    assert DecisionEngine.classify_failure("3ds_stepup", "Customer 3DS required", False) == FailureType.AUTH_REQUIRED

def test_safety_constraints():
    # Hard decline should halt retries
    is_safe, action, msg = DecisionEngine.evaluate_safety_rules(
        classification=FailureType.HARD_DECLINE,
        retry_count=0,
        max_retries=3,
        amount=2000,
        high_value_threshold=10000,
        is_expired=False
    )
    assert not is_safe
    assert action == RecoveryAction.DO_NOT_RETRY

    # Expired card should route to customer action dunning
    is_safe, action, msg = DecisionEngine.evaluate_safety_rules(
        classification=FailureType.CREDENTIAL_ISSUE,
        retry_count=0,
        max_retries=3,
        amount=2000,
        high_value_threshold=10000,
        is_expired=True
    )
    assert not is_safe
    assert action == RecoveryAction.CUSTOMER_ACTION

def test_langgraph_execution():
    initial_state = {
        "payment_id": "test_pay_01",
        "customer_id": "test_cust_01",
        "customer_name": "Aditya Verma",
        "customer_email": "aditya@demo.in",
        "amount": 2000.0,
        "currency": "INR",
        "failure_code": "insufficient_funds",
        "failure_reason": "Low balance in customer account",
        "payment_method_type": "card",
        "is_card_expired": False,
        "customer_history": {
            "tenure_months": 12,
            "historical_success_rate": 0.95,
            "segment": "pro"
        },
        "previous_attempts": 0,
        "previous_successes": 1,
        "geographic_context": "IN",
        "current_timestamp": "2026-08-21T10:00:00Z",
        "retry_count": 0,
        "max_retry_count": 3,
        "audit_trail": []
    }
    result = recovery_graph_app.invoke(initial_state)
    assert result["classification"] == FailureType.SOFT_DECLINE
    assert result["recommended_action"] == RecoveryAction.RETRY
    assert result["recovery_probability"] > 0.60
    assert len(result["audit_trail"]) >= 6

def test_data_store_and_kpis():
    kpis = store.get_kpis(admin_id=DEMO_ADMIN_ID)
    assert kpis.revenue_at_risk > 0
    assert kpis.recovered_revenue > 0
    assert kpis.recovery_rate > 0
    assert kpis.failed_payments_count > 0

    exp = store.get_experiments_stats(admin_id=DEMO_ADMIN_ID)
    assert exp.ai_recovery_rate > exp.control_recovery_rate
    assert exp.recovery_uplift_percent > 0

def test_admin_data_isolation():
    # Demo Admin has rich dataset
    demo_kpis = store.get_kpis(admin_id=DEMO_ADMIN_ID)
    assert demo_kpis.failed_payments_count > 0
    
    # New Admin starts with ZERO data
    new_admin_id = "admin_new_founder_999"
    new_kpis = store.get_kpis(admin_id=new_admin_id)
    assert new_kpis.failed_payments_count == 0
    assert new_kpis.recovered_revenue == 0.0
    assert new_kpis.recovery_rate == 0.0
    
    new_payments = store.get_payments(admin_id=new_admin_id)
    assert new_payments["total"] == 0
    assert len(new_payments["items"]) == 0

@pytest.mark.anyio
async def test_gmail_smtp_email_service_and_multi_tenant_communication():
    html = EmailService.build_responsive_html_template(
        customer_name="Rahul Sharma",
        headline="Payment Update Required",
        body="We could not complete your subscription payment.",
        amount=2000.0,
        currency="INR",
        update_link="http://localhost:5175/update-payment?payment_id=123",
        cta_text="Update Payment Method"
    )
    assert "Rahul Sharma" in html
    assert "₹2,000.00" in html
    assert "http://localhost:5175/update-payment?payment_id=123" in html

    # Test EmailService send
    res = EmailService.send_recovery_email(
        to_email="rahul.sharma@example.in",
        customer_name="Rahul Sharma",
        subject="Action Required: Update payment method",
        html_content=html
    )
    assert res["success"] is True
    assert "gmail" in res["provider"].lower()
    assert res["message_id"] is not None

    # Test Test Email Helper
    test_res = EmailService.send_test_email("operator@example.com")
    assert test_res["success"] is True

@pytest.mark.anyio
async def test_ai_router_and_gemini_intelligence():
    # Test failure analysis via AIRouter
    analysis = await AIRouter.analyze_payment_failure({
        "payment_id": "pay_test_01",
        "amount": 2000,
        "currency": "INR",
        "failure_code": "insufficient_funds",
        "failure_reason": "Low account balance",
        "is_card_expired": False,
        "customer_name": "Rahul Sharma",
        "customer_history": {"tenure_months": 12, "historical_success_rate": 0.95}
    })
    assert analysis.recovery_probability > 50
    assert analysis.recommended_action in ["WAIT_AND_RETRY", "RETRY"]
    assert len(analysis.reasoning_summary) > 5

    # Test dunning message generation via AIRouter
    dunning = await AIRouter.generate_dunning_message({
        "payment_id": "pay_test_01",
        "customer_name": "Rahul Sharma",
        "amount": 2000.0,
        "currency": "INR",
        "failure_type": "insufficient_funds",
        "email_type": "PAYMENT_UPDATE_REQUIRED"
    })
    assert len(dunning.subject) > 5
    assert len(dunning.body) > 10

    # Test policy explanation
    policy_exp = await AIRouter.explain_policy_decision({
        "customer_name": "Rahul Sharma",
        "amount": 2000.0,
        "failure_code": "insufficient_funds",
        "recovery_probability": 74
    })
    assert len(policy_exp) > 10

    # Test analytics interpretation
    analytics_exp = await AIRouter.analyze_recovery_analytics({
        "ai_recovery_rate": 70.2,
        "control_recovery_rate": 38.2,
        "recovery_uplift_percent": 24.9
    })
    assert "70.2%" in analytics_exp
    assert "+24.9%" in analytics_exp

@pytest.mark.anyio
async def test_groq_assistant_and_tool_calling():
    # Test conversational copilot with real database tools
    res = await AIRouter.chat_with_assistant(
        user_message="Why did Rahul's payment fail?",
        chat_history=[],
        admin_id=DEMO_ADMIN_ID,
        admin_name="RecoverAI Demo Admin",
        is_demo=True
    )
    assert len(res["reply"]) > 20
    assert len(res["tools_called"]) > 0

    # Verify tool execution records
    tool_names = [t["tool"] for t in res["tools_called"]]
    assert "get_recovery_queue" in tool_names

    # Verify AI audit logs recorded in store
    logs = store.get_ai_activities(DEMO_ADMIN_ID)
    assert len(logs) > 0

@pytest.mark.anyio
async def test_ai_provider_health_checks():
    status = AIRouter.get_services_status()
    assert "gemini" in status
    assert "groq" in status
    assert "openrouter" in status
    assert "langgraph" in status
    assert "gmail" in status
    assert "supabase" in status

    # Check individual health queries
    assert AIRouter.get_provider_health("gemini")["provider"] == "Google Gemini"
    assert AIRouter.get_provider_health("groq")["provider"] == "Groq"
    assert AIRouter.get_provider_health("langgraph")["status"] == "operational"
    assert AIRouter.get_provider_health("supabase")["status"] == "operational"

def test_custom_auth_exclusive_and_tenant_security():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.services.auth_service import auth_service
    from app.api.auth import DEMO_ADMIN

    client = TestClient(app)

    # 1. Test Demo Admin endpoint
    demo_res = client.post("/api/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert "token" in demo_data
    assert demo_data["admin"]["id"] == DEMO_ADMIN.id

    # 2. Register and verify a real user
    user_a, token_a = auth_service.register_user(email="user_a@company.com", password="Password123!", name="User Alpha")
    auth_service.verify_email_token(token_a)

    login_res = client.post("/api/auth/login", json={"email": "user_a@company.com", "password": "Password123!"})
    assert login_res.status_code == 200
    sess_token_a = login_res.json()["token"]

    # 3. Test authenticated endpoint with User Alpha's session
    auth_headers_a = {"Authorization": f"Bearer {sess_token_a}"}
    me_res = client.get("/api/auth/me", headers=auth_headers_a)
    assert me_res.status_code == 200
    assert me_res.json()["user"]["id"] == user_a.id
    assert me_res.json()["user"]["email"] == "user_a@company.com"

    # 4. Multi-Tenant Security: Valid X-Admin-Id matching authenticated user passes
    valid_tenant_res = client.get(
        "/api/auth/me",
        headers={**auth_headers_a, "X-Admin-Id": user_a.id}
    )
    assert valid_tenant_res.status_code == 200

    # 5. Multi-Tenant Security: Spoofed X-Admin-Id (User A trying to access User B's tenant) is REJECTED with 403
    spoofed_res = client.get(
        "/api/auth/me",
        headers={**auth_headers_a, "X-Admin-Id": "usr_other_tenant_bbb"}
    )
    assert spoofed_res.status_code == 403
    assert "Tenant identity mismatch" in spoofed_res.json()["detail"]

    # 6. Invalid token rejection
    bad_res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_nonexistent_token"})
    assert bad_res.status_code == 401
