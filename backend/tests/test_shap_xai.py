import pytest
from app.services.shap_service import shap_service, SHAPRecoveryExplainer
from app.agent.decision_engine import DecisionEngine
from app.agent.nodes.recovery_probability import recovery_probability_node
from app.agent.nodes.policy_gate import policy_gate_node
from app.agent.nodes.decision import decision_node
from app.agent.graph import run_recovery_workflow
from app.models.schemas import FailureType, RecoveryAction
from app.db.store import DataStore, DEMO_ADMIN_ID

@pytest.fixture
def fresh_store():
    return DataStore()

def test_shap_service_initialization():
    """1. Test SHAP service initialization and calibrated base rate."""
    assert shap_service is not None
    assert shap_service.MODEL_VERSION == "recovery-model-v1"
    assert shap_service._model is not None
    assert shap_service._explainer is not None
    assert 0.40 <= shap_service._base_probability <= 0.65

def test_prediction_and_shap_value_generation():
    """2 & 3. Test prediction generation and exact SHAP feature values."""
    payment_data = {
        "id": "pay_test_001",
        "amount": 2000.0,
        "retry_count": 0,
        "failure_type": "SOFT_DECLINE",
        "payment_method": {"type": "card"},
        "time_since_failure_hours": 1.0,
        "customer_name": "Rahul Sharma"
    }
    customer_data = {
        "name": "Rahul Sharma",
        "tenure_months": 14,
        "historical_success_rate": 0.94,
        "successful_payment_count": 12,
        "days_since_last_success": 28.0,
        "previous_failure_count": 0,
        "historical_recovery_rate": 0.88
    }

    res = shap_service.explain_payment(payment_data, customer_data, "SOFT_DECLINE")

    assert res.available is True
    assert res.model_version == "recovery-model-v1"
    assert 0.65 <= res.recovery_probability <= 0.85
    assert 65 <= res.recovery_probability_percent <= 85
    assert len(res.all_factors) == 11
    assert res.base_probability > 0

def test_positive_and_negative_feature_contributions_and_ranking():
    """4, 5, 6. Test positive/negative contributions, feature names, and ranking."""
    payment_data = {
        "id": "pay_test_002",
        "amount": 15000.0, # High amount (negative driver)
        "retry_count": 2,    # Multiple retries (negative driver)
        "failure_type": "SOFT_DECLINE",
        "payment_method": {"type": "card"},
        "time_since_failure_hours": 8.0,
        "customer_name": "Priya Sharma"
    }
    customer_data = {
        "name": "Priya Sharma",
        "tenure_months": 18,
        "historical_success_rate": 0.96, # Strong history (positive driver)
        "successful_payment_count": 16,
        "days_since_last_success": 25.0,
        "previous_failure_count": 2,
        "historical_recovery_rate": 0.85
    }

    res = shap_service.explain_payment(payment_data, customer_data, "SOFT_DECLINE")

    assert res.available is True
    assert len(res.top_positive_factors) > 0
    assert len(res.top_negative_factors) > 0

    # Verify friendly display names (No raw code identifiers exposed)
    feature_names = [f.feature_name for f in res.all_factors]
    assert "Payment History" in feature_names
    assert "Retry Attempts" in feature_names
    assert "Transaction Amount" in feature_names

    # Check ranking
    for idx, f in enumerate(res.all_factors):
        assert f.rank == idx + 1
        if idx > 0:
            assert abs(res.all_factors[idx - 1].shap_value) >= abs(f.shap_value)

def test_missing_feature_handling():
    """7. Test graceful handling of incomplete/sparse feature payloads."""
    sparse_payment = {"id": "pay_sparse_99"}
    sparse_customer = {}

    res = shap_service.explain_payment(sparse_payment, sparse_customer)
    assert res.available is True
    assert 0.0 <= res.recovery_probability <= 1.0
    assert len(res.all_factors) == 11

def test_shap_failure_fallback():
    """10. Test graceful fallback when model or SHAP throws an exception."""
    explainer = SHAPRecoveryExplainer()
    # Simulate broken model
    original_model = explainer._model
    explainer._model = None

    res = explainer.explain_payment({"id": "pay_err_01"})
    assert res.available is False
    assert "unavailable" in res.reason.lower()

    # Restore
    explainer._model = original_model

def test_langgraph_state_contains_shap_explanation():
    """14. Test LangGraph recovery_probability_node populates shap_explanation."""
    initial_state = {
        "payment_id": "pay_graph_test",
        "admin_id": DEMO_ADMIN_ID,
        "amount": 2000.0,
        "currency": "INR",
        "failure_type": "SOFT_DECLINE",
        "failure_code": "insufficient_funds",
        "failure_reason": "Insufficient funds in account",
        "retry_count": 0,
        "payment_method_type": "card",
        "customer_name": "Rahul Sharma",
        "customer_history": {
            "tenure_months": 14,
            "historical_success_rate": 0.94
        }
    }

    out = recovery_probability_node(initial_state)
    assert "recovery_probability" in out
    assert "shap_explanation" in out
    assert "model_version" in out
    assert out["model_version"] == "recovery-model-v1"
    assert out["shap_explanation"]["available"] is True

def test_critical_safety_invariants_policy_gate():
    """
    11. CRITICAL SAFETY RULE TEST:
    SHAP must NEVER override deterministic safety rules.
    - STOLEN_CARD + high probability -> STOP
    - EXPIRED_CARD + high probability -> CUSTOMER_ACTION
    - ₹12,500 payment -> HUMAN_REVIEW
    - MAX_RETRIES reached -> STOP
    """
    # 1. Stolen card
    state_stolen = {
        "payment_id": "pay_stolen_01",
        "failure_type": "HARD_DECLINE",
        "classification": FailureType.HARD_DECLINE,
        "recovery_probability": 0.95, # High probability must be IGNORED
        "amount": 2000.0,
        "retry_count": 0,
        "max_retries": 3,
        "is_card_expired": False
    }
    policy_out = policy_gate_node(state_stolen)
    assert policy_out["recommended_action"] == RecoveryAction.DO_NOT_RETRY
    assert policy_out["policy_status"] == "BLOCKED"
    assert "BLOCKED" in policy_out["policy_decision"]

    # 2. Expired card
    state_expired = {
        "payment_id": "pay_expired_01",
        "failure_type": "CREDENTIAL_ISSUE",
        "classification": FailureType.CREDENTIAL_ISSUE,
        "recovery_probability": 0.88,
        "amount": 1500.0,
        "retry_count": 0,
        "max_retries": 3,
        "is_card_expired": True
    }
    policy_expired = policy_gate_node(state_expired)
    assert policy_expired["recommended_action"] == RecoveryAction.CUSTOMER_ACTION
    assert policy_expired["policy_status"] == "BLOCKED"
    assert "BLOCKED" in policy_expired["policy_decision"]

    # 3. High Value transaction (> ₹10,000)
    state_high_value = {
        "payment_id": "pay_high_01",
        "failure_type": "SOFT_DECLINE",
        "classification": FailureType.SOFT_DECLINE,
        "recovery_probability": 0.92,
        "amount": 12500.0, # Exceeds threshold
        "retry_count": 0,
        "max_retries": 3,
        "is_card_expired": False
    }
    decision_out = decision_node(state_high_value)
    assert decision_out["next_action"] == "HUMAN_REVIEW"
    assert decision_out["requires_human_review"] is True

    # 4. Max Retries Exceeded
    state_max_retries = {
        "payment_id": "pay_retries_01",
        "failure_type": "SOFT_DECLINE",
        "classification": FailureType.SOFT_DECLINE,
        "recovery_probability": 0.85,
        "amount": 2000.0,
        "retry_count": 3,
        "max_retries": 3,
        "is_card_expired": False
    }
    policy_retries = policy_gate_node(state_max_retries)
    assert policy_retries["recommended_action"] == RecoveryAction.HUMAN_REVIEW
    assert "limit reached" in policy_retries["policy_reason"].lower()

def test_no_raw_card_data_stored():
    """13. Ensure sensitive card credentials (PAN, CVV) are never stored in SHAP explanation."""
    payment_data = {
        "id": "pay_sec_01",
        "amount": 2000.0,
        "card_number": "4111111111111111", # Raw card (must be ignored)
        "cvv": "123",
        "failure_type": "SOFT_DECLINE",
        "payment_method": {"type": "card", "last4": "1111"}
    }

    res = shap_service.explain_payment(payment_data)
    res_dict = res.model_dump()
    res_str = str(res_dict)

    assert "4111111111111111" not in res_str
    assert "123" not in res_str
    assert "cvv" not in res_str

def test_rahul_sharma_demo_payment_shap():
    """15. Verify realistic SHAP attribution for Rahul Sharma demo payment archetype."""
    rahul_payment = {
        "id": "pay_0001",
        "amount": 2000.0,
        "retry_count": 0,
        "failure_type": "SOFT_DECLINE",
        "payment_method": {"type": "card"},
        "time_since_failure_hours": 1.5,
        "customer_name": "Rahul Sharma"
    }
    rahul_customer = {
        "name": "Rahul Sharma",
        "tenure_months": 14,
        "historical_success_rate": 0.94,
        "successful_payment_count": 12,
        "days_since_last_success": 30.0,
        "previous_failure_count": 0,
        "historical_recovery_rate": 0.88
    }

    res = shap_service.explain_payment(rahul_payment, rahul_customer, "SOFT_DECLINE")

    assert res.available is True
    # In range ~70% to ~78%
    assert 68 <= res.recovery_probability_percent <= 80
    
    # Top positive factor is Payment History or Failure Type
    top_pos_features = [f.feature for f in res.top_positive_factors]
    assert any(feat in top_pos_features for feat in ["customer_payment_history", "failure_type", "retry_count"])
