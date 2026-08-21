-- ==============================================================================
-- RecoverAI - Supabase PostgreSQL Schema & Security Policies
-- Track 3: AI Revenue Recovery (Razorpay AI Builder Internship 2026)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses / Merchants
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL DEFAULT 'saas_subscription',
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subscription_model VARCHAR(100) NOT NULL DEFAULT 'monthly_recurring',
    razorpay_account_id VARCHAR(255),
    is_live_mode BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Merchant Policies
CREATE TABLE IF NOT EXISTS merchant_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    max_retry_attempts INT NOT NULL DEFAULT 3,
    max_recovery_window_hours INT NOT NULL DEFAULT 72,
    dunning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    human_approval_threshold NUMERIC(4, 2) NOT NULL DEFAULT 0.60,
    high_value_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(10) NOT NULL DEFAULT 'IN',
    segment VARCHAR(50) NOT NULL DEFAULT 'pro', -- starter, pro, enterprise
    lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tenure_months INT NOT NULL DEFAULT 1,
    historical_success_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Payment Methods
-- NOTE: Never store raw PAN or CVV. Storing masked preview and token only.
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'card', -- card, upi_autopay, netbanking, mandate
    card_brand VARCHAR(50), -- Visa, Mastercard, RuPay, Amex
    last4 VARCHAR(4),
    exp_month INT,
    exp_year INT,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    token_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'failed', -- failed, scheduled, in_review, recovered, churned
    subscription_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    razorpay_invoice_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Payment Failures
CREATE TABLE IF NOT EXISTS payment_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    error_code VARCHAR(100) NOT NULL,
    decline_reason TEXT NOT NULL,
    failure_type VARCHAR(50) NOT NULL, -- soft_decline, hard_decline, credential_issue, risk_limit, network_timeout
    bank_name VARCHAR(100),
    is_retryable BOOLEAN NOT NULL DEFAULT TRUE,
    raw_provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. AI Decisions
CREATE TABLE IF NOT EXISTS ai_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    classification VARCHAR(50) NOT NULL,
    recommended_action VARCHAR(50) NOT NULL, -- retry, wait_and_retry, customer_action, do_not_retry, human_review
    recovery_probability NUMERIC(4, 2) NOT NULL,
    confidence NUMERIC(4, 2) NOT NULL,
    recommended_retry_time TIMESTAMP WITH TIME ZONE,
    explanation TEXT NOT NULL,
    decision_factors JSONB NOT NULL,
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    human_approval_status VARCHAR(50) DEFAULT 'not_required', -- not_required, pending, approved, rejected
    agent_version VARCHAR(50) NOT NULL DEFAULT 'v1.2-langgraph',
    input_snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Recovery Workflows (LangGraph state tracking)
CREATE TABLE IF NOT EXISTS recovery_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    current_node VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, completed, waiting, human_review, terminated
    graph_state JSONB NOT NULL,
    retry_attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Retry Attempts
CREATE TABLE IF NOT EXISTS retry_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL, -- scheduled, in_flight, successful, failed
    response_code VARCHAR(100),
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Dunning Events
CREATE TABLE IF NOT EXISTS dunning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    stage INT NOT NULL DEFAULT 1,
    channel VARCHAR(50) NOT NULL DEFAULT 'email', -- email, sms, whatsapp
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    action_link VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, sent, opened, clicked, converted
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Recovery Outcomes (Closed-Loop Learning)
CREATE TABLE IF NOT EXISTS recovery_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    initial_failure_type VARCHAR(50) NOT NULL,
    initial_error_code VARCHAR(100) NOT NULL,
    decision_action VARCHAR(50) NOT NULL,
    predicted_probability NUMERIC(4, 2) NOT NULL,
    actual_outcome VARCHAR(50) NOT NULL, -- recovered, churned, abandoned
    recovered_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_retries_used INT NOT NULL DEFAULT 0,
    total_dunning_sent INT NOT NULL DEFAULT 0,
    recovery_time_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Experiments & A/B Testing
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    split_ratio NUMERIC(4, 2) NOT NULL DEFAULT 0.50, -- 50% AI / 50% Control
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    group_name VARCHAR(50) NOT NULL, -- treatment (AI Recovery) vs control (Standard Naive Retry)
    is_recovered BOOLEAN NOT NULL DEFAULT FALSE,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID,
    event_type VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL DEFAULT 'system',
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_type ON payment_failures(failure_type);
CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_actual ON recovery_outcomes(actual_outcome);
