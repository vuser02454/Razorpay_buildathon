from typing import TypedDict, Optional, Dict, Any, List
from app.models.schemas import FailureType, RecoveryAction

class RecoveryState(TypedDict, total=False):
    # Payment & Tenant Identifiers
    payment_id: str
    admin_id: str
    customer_id: str
    customer_name: str
    customer_email: str
    amount: float
    currency: str
    failure_code: str
    failure_reason: str
    payment_method_type: str
    is_card_expired: bool
    customer_history: Dict[str, Any]
    
    # Retry state
    retry_count: int
    max_retry_count: int
    previous_attempts: int
    previous_successes: int
    geographic_context: str
    current_timestamp: str

    # Node Output 1: Failure Classification
    failure_type: str  # SOFT_DECLINE, HARD_DECLINE, CREDENTIAL_ISSUE, NETWORK_TIMEOUT, etc.
    classification: Optional[FailureType] # Schema compatibility

    # Node Output 2: Recovery Probability & ML Confidence & SHAP Explainability
    recovery_probability: float # 0.0 to 1.0 (or 0 to 100)
    confidence: float # 0.0 to 1.0
    recommended_retry_time: Optional[str]
    shap_explanation: Optional[Dict[str, Any]]
    model_version: Optional[str]

    # Node Output 3: Deterministic Policy Safety Gate
    policy_decision: str # RETRY_ELIGIBLE, BLOCKED_STOLEN, BLOCKED_EXPIRED, HUMAN_REVIEW_REQUIRED, MAX_RETRIES_EXCEEDED
    policy_reason: str
    policy_status: str
    risk_level: str # low, medium, high

    # Node Output 4: Decision Node
    next_action: str # RETRY, CUSTOMER_ACTION, HUMAN_REVIEW, STOP
    recommended_action: Optional[RecoveryAction]
    requires_human_review: bool
    human_approval_status: str # not_required, pending, approved, rejected

    # Node Output 5: Retry Action Execution
    retry_time: Optional[str]
    retry_scheduled: bool
    retry_gateway_response: Optional[Dict[str, Any]]

    # Node Output 6: Communication & Dunning
    email_required: bool
    email_content: Optional[Dict[str, Any]]
    email_sent: bool
    email_message_id: Optional[str]
    dunning_stage: Optional[int]
    dunning_payload: Optional[Dict[str, Any]]

    # Node Output 7: Final Outcome Tracking
    payment_status: str # PENDING_RETRY, ACTION_REQUIRED, HUMAN_REVIEW, RECOVERED, FAILED
    outcome: str # RETRY_SCHEDULED, EMAIL_DISPATCHED, ESCALATED_HUMAN_REVIEW, DO_NOT_RETRY
    final_outcome: Optional[str]
    audit_log: List[Dict[str, Any]]
    audit_trail: List[Dict[str, Any]]
    decision_factors: Optional[Dict[str, Any]]
    explanation: Optional[str]
    error: Optional[str]
