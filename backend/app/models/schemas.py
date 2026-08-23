from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FailureType(str, Enum):
    SOFT_DECLINE = "soft_decline"
    HARD_DECLINE = "hard_decline"
    CREDENTIAL_ISSUE = "credential_issue"
    RISK_LIMIT = "risk_limit"
    NETWORK_TIMEOUT = "network_timeout"
    AUTH_REQUIRED = "authentication_required"

class RecoveryAction(str, Enum):
    RETRY = "retry"
    WAIT_AND_RETRY = "wait_and_retry"
    CUSTOMER_ACTION = "customer_action"
    DO_NOT_RETRY = "do_not_retry"
    HUMAN_REVIEW = "human_review"

class PaymentStatus(str, Enum):
    FAILED = "failed"
    SCHEDULED = "scheduled"
    IN_REVIEW = "in_review"
    RECOVERED = "recovered"
    CHURNED = "churned"

class CustomerSegment(str, Enum):
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class EmailType(str, Enum):
    RECOVERY_ACTION_REQUIRED = "RECOVERY_ACTION_REQUIRED"
    PAYMENT_UPDATE_REQUIRED = "PAYMENT_UPDATE_REQUIRED"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    PAYMENT_RECOVERED = "PAYMENT_RECOVERED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    RECOVERY_STOPPED = "RECOVERY_STOPPED"
    FINAL_RECOVERY_NOTICE = "FINAL_RECOVERY_NOTICE"
    TEST_EMAIL = "TEST_EMAIL"

class DecisionFactors(BaseModel):
    failure_type: str
    historical_success_rate: float
    previous_attempts_count: int
    customer_tenure_months: int
    amount_risk_tier: str
    bank_health_score: float
    optimal_time_slot: str
    network_retry_safe: bool
    policy_constraint_applied: Optional[str] = None

class SHAPFeatureContribution(BaseModel):
    feature: str
    feature_name: str
    value: Any
    display_value: str
    shap_value: float
    impact: str # "positive" | "negative" | "neutral"
    impact_percent: int
    rank: int

class SHAPExplanationResponse(BaseModel):
    available: bool = True
    reason: Optional[str] = None
    payment_id: Optional[str] = None
    model_version: str = "recovery-model-v1"
    recovery_probability: float = 0.50
    recovery_probability_percent: int = 50
    base_probability: float = 0.51
    base_probability_percent: int = 51
    net_customer_impact_percent: int = 0
    top_positive_factors: List[SHAPFeatureContribution] = []
    top_negative_factors: List[SHAPFeatureContribution] = []
    all_factors: List[SHAPFeatureContribution] = []
    natural_language_summary: Optional[str] = None

class ExplainRecoveryRequest(BaseModel):
    payment_id: str

class AIDecision(BaseModel):
    id: str
    payment_id: str
    classification: FailureType
    recommended_action: RecoveryAction
    recovery_probability: float
    confidence: float
    recommended_retry_time: Optional[str] = None
    explanation: str
    decision_factors: DecisionFactors
    shap_explanation: Optional[SHAPExplanationResponse] = None
    model_version: str = "recovery-model-v1"
    requires_human_review: bool = False
    human_approval_status: str = "not_required" # not_required, pending, approved, rejected
    agent_version: str = "RecoverAI-LangGraph-v2.0"
    created_at: str

class PaymentFailure(BaseModel):
    id: str
    payment_id: str
    error_code: str
    decline_reason: str
    failure_type: FailureType
    bank_name: Optional[str] = "HDFC Bank"
    is_retryable: bool
    created_at: str

class PaymentMethod(BaseModel):
    id: str
    type: str = "card"
    card_brand: str = "Visa"
    last4: str = "4242"
    exp_month: int = 12
    exp_year: int = 2028
    is_expired: bool = False

class Customer(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    country: str = "IN"
    segment: CustomerSegment = CustomerSegment.PRO
    lifetime_value: float = 24000.0
    tenure_months: int = 8
    historical_success_rate: float = 0.92

class RetryAttempt(BaseModel):
    id: str
    payment_id: str
    attempt_number: int
    scheduled_time: str
    executed_time: Optional[str] = None
    status: str # scheduled, successful, failed
    response_code: Optional[str] = None
    response_message: Optional[str] = None

class DunningEvent(BaseModel):
    id: str
    payment_id: str
    customer_id: str
    customer_name: str
    customer_email: str
    stage: int = 1
    channel: str = "email" # email, sms, whatsapp
    subject: Optional[str] = None
    message_body: str
    action_link: str
    status: str = "scheduled" # scheduled, sent, converted
    sent_at: Optional[str] = None

class RecoveryCommunication(BaseModel):
    id: str
    admin_id: str
    payment_id: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    channel: str = "email"
    email_type: EmailType = EmailType.PAYMENT_UPDATE_REQUIRED
    subject: str
    provider: str = "brevo"
    provider_message_id: Optional[str] = None
    status: str = "SENT" # QUEUED, SENDING, SENT, FAILED
    error_message: Optional[str] = None
    created_at: str
    sent_at: Optional[str] = None

class WorkflowStep(BaseModel):
    node_name: str
    status: str # completed, in_progress, pending, failed
    timestamp: str
    details: Dict[str, Any] = {}

class Payment(BaseModel):
    id: str
    business_id: str = "biz_default_01"
    customer_id: str
    customer: Optional[Customer] = None
    payment_method: Optional[PaymentMethod] = None
    amount: float
    currency: str = "INR"
    status: PaymentStatus = PaymentStatus.FAILED
    subscription_cycle: str = "monthly"
    failure: Optional[PaymentFailure] = None
    latest_decision: Optional[AIDecision] = None
    retry_count: int = 0
    max_retries: int = 3
    workflow_steps: List[WorkflowStep] = []
    source: str = "DEMO" # DEMO | RAZORPAY | TEST
    created_at: str
    updated_at: str

class MerchantPolicy(BaseModel):
    max_retry_attempts: int = 3
    max_recovery_window_hours: int = 72
    dunning_enabled: bool = True
    human_approval_threshold: float = 0.60
    high_value_threshold: float = 10000.0
    auto_execute_soft_declines: bool = True

class DashboardKPIs(BaseModel):
    revenue_at_risk: float
    recovered_revenue: float
    recovery_rate: float
    failed_payments_count: int
    active_workflows_count: int
    ai_recommended_recoveries: int
    currency: str = "INR"
    currency_symbol: str = "₹"

class ExperimentStats(BaseModel):
    control_payments: int
    control_recovered: int
    control_recovered_revenue: float
    control_recovery_rate: float
    ai_payments: int
    ai_recovered: int
    ai_recovered_revenue: float
    ai_recovery_rate: float
    recovery_uplift_percent: float
    statistical_significance: bool
    confidence_level: Optional[float]
    sample_size_sufficient: bool
    status_note: str

class ClosedLoopMetric(BaseModel):
    failure_category: str
    baseline_success_rate: float
    current_success_rate: float
    improvement_delta: float
    total_samples: int
    last_updated: str

class RazorpayConnectionStatus(BaseModel):
    is_connected: bool = False
    account_id: Optional[str] = None
    merchant_name: Optional[str] = None
    merchant_email: Optional[str] = None
    last_synced_at: Optional[str] = None
    last_verified_at: Optional[str] = None
    status: str = "disconnected" # connected, disconnected, syncing, error
    auth_url: Optional[str] = None
    permissions: List[str] = [
        "Payment monitoring",
        "Payment status",
        "Payment recovery data"
    ]

class RazorpayVerificationRequest(BaseModel):
    email: str

class RazorpayVerificationResponse(BaseModel):
    success: bool
    message: str
    masked_email: Optional[str] = None
    resend_cooldown_seconds: int = 45

class RazorpayVerifyOTPRequest(BaseModel):
    email: str
    otp: str

class RazorpayVerifyOTPResponse(BaseModel):
    success: bool
    verified: bool
    message: str
    remaining_attempts: Optional[int] = None

class RazorpayAuthorizeRequest(BaseModel):
    email: str
    account_id: Optional[str] = None
    merchant_name: Optional[str] = None

class RazorpayTestConnectionResponse(BaseModel):
    success: bool
    status: str
    message: str
    latency_ms: int = 42
    account_id: Optional[str] = None
    merchant_email: Optional[str] = None

class EmailPreviewRequest(BaseModel):
    payment_id: str
    email_type: Optional[EmailType] = EmailType.PAYMENT_UPDATE_REQUIRED

class EmailPreviewResponse(BaseModel):
    subject: str
    headline: str
    body: str
    cta_text: str
    tone: str
    recipient_name: str
    recipient_email: str
    payment_amount: float
    currency: str
    update_link: Optional[str]
    html_content: str

class EmailSendRequest(BaseModel):
    payment_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    email_type: Optional[EmailType] = EmailType.PAYMENT_UPDATE_REQUIRED

class EmailSendResponse(BaseModel):
    success: bool
    message: str
    provider: str = "brevo"
    provider_message_id: Optional[str] = None
    communication: Optional[RecoveryCommunication] = None

class TestEmailRequest(BaseModel):
    to_email: str = "test@example.com"

class TestEmailResponse(BaseModel):
    success: bool
    provider: str = "brevo"
    message: str
    provider_message_id: Optional[str] = None

class SimulateFailureRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    amount: float = 2000.0
    currency: str = "INR"
    failure_code: str = "insufficient_funds" # insufficient_funds, card_expired, auth_required, stolen_card, bank_error, velocity_limit
    bank_name: str = "HDFC Bank"

class SimulateRetryRequest(BaseModel):
    payment_id: str
    outcome: str = "success" # success, failed
