export type FailureType =
  | 'soft_decline'
  | 'hard_decline'
  | 'credential_issue'
  | 'risk_limit'
  | 'network_timeout'
  | 'authentication_required';

export type RecoveryAction =
  | 'retry'
  | 'wait_and_retry'
  | 'customer_action'
  | 'do_not_retry'
  | 'human_review';

export type PaymentStatus =
  | 'failed'
  | 'scheduled'
  | 'in_review'
  | 'recovered'
  | 'churned';

export type CustomerSegment = 'starter' | 'pro' | 'enterprise';

export interface DecisionFactors {
  failure_type: string;
  historical_success_rate: number;
  previous_attempts_count: number;
  customer_tenure_months: number;
  amount_risk_tier: string;
  bank_health_score: number;
  optimal_time_slot: string;
  network_retry_safe: boolean;
  policy_constraint_applied?: string;
}

export interface AIDecision {
  id: string;
  payment_id: string;
  classification: FailureType;
  recommended_action: RecoveryAction;
  recovery_probability: number;
  confidence: number;
  recommended_retry_time?: string;
  explanation: string;
  decision_factors: DecisionFactors;
  requires_human_review: boolean;
  human_approval_status: string;
  agent_version: string;
  created_at: string;
}

export interface PaymentFailure {
  id: string;
  payment_id: string;
  error_code: string;
  decline_reason: string;
  failure_type: FailureType;
  bank_name?: string;
  is_retryable: boolean;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card_brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_expired: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  segment: CustomerSegment;
  lifetime_value: number;
  tenure_months: number;
  historical_success_rate: number;
}

export interface WorkflowStep {
  node_name: string;
  status: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface Payment {
  id: string;
  business_id: string;
  customer_id: string;
  customer?: Customer;
  payment_method?: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  subscription_cycle: string;
  failure?: PaymentFailure;
  latest_decision?: AIDecision;
  retry_count: number;
  max_retries: number;
  workflow_steps: WorkflowStep[];
  source?: 'DEMO' | 'RAZORPAY' | 'TEST' | string;
  created_at: string;
  updated_at: string;
}

export interface RazorpayConnectionStatus {
  is_connected: boolean;
  account_id?: string | null;
  merchant_name?: string | null;
  merchant_email?: string | null;
  last_synced_at?: string | null;
  last_verified_at?: string | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'error' | string;
  auth_url?: string | null;
  permissions?: string[];
}

export interface RazorpayVerificationResponse {
  success: boolean;
  message: string;
  masked_email?: string;
  resend_cooldown_seconds: number;
}

export interface RazorpayVerifyOTPResponse {
  success: boolean;
  verified: boolean;
  message: string;
  remaining_attempts?: number;
}

export interface RazorpayTestConnectionResponse {
  success: boolean;
  status: string;
  message: string;
  latency_ms: number;
  account_id?: string | null;
  merchant_email?: string | null;
}

export interface RecoveryCommunication {
  id: string;
  admin_id: string;
  payment_id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  channel: string;
  email_type: string;
  subject: string;
  provider: string;
  provider_message_id?: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'SENDING' | string;
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

export interface EmailPreviewResponse {
  subject: string;
  headline: string;
  body: string;
  cta_text: string;
  tone: string;
  recipient_name: string;
  recipient_email: string;
  payment_amount: number;
  currency: string;
  update_link?: string;
  html_content: string;
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
  provider: string;
  provider_message_id?: string;
  communication?: RecoveryCommunication;
}

export interface DashboardKPIs {
  revenue_at_risk: number;
  recovered_revenue: number;
  recovery_rate: number;
  failed_payments_count: number;
  active_workflows_count: number;
  ai_recommended_recoveries: number;
  currency: string;
  currency_symbol: string;
}

export interface DunningEvent {
  id: string;
  payment_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  stage: number;
  channel: string;
  subject?: string;
  message_body: string;
  action_link: string;
  status: string;
  sent_at?: string;
}

export interface ExperimentStats {
  control_payments: number;
  control_recovered: number;
  control_recovered_revenue: number;
  control_recovery_rate: number;
  ai_payments: number;
  ai_recovered: number;
  ai_recovered_revenue: number;
  ai_recovery_rate: number;
  recovery_uplift_percent: number;
  statistical_significance: boolean;
  confidence_level?: number;
  sample_size_sufficient: boolean;
  status_note: string;
}

export interface ClosedLoopMetric {
  failure_category: string;
  baseline_success_rate: number;
  current_success_rate: number;
  improvement_delta: number;
  total_samples: number;
  last_updated: string;
}

export interface MerchantPolicy {
  max_retry_attempts: number;
  max_recovery_window_hours: number;
  dunning_enabled: boolean;
  human_approval_threshold: number;
  high_value_threshold: number;
  auto_execute_soft_declines: boolean;
}
