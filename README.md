# ⚡ RecoverAI — Autonomous AI Revenue Recovery Platform

> **Hackathon:** Razorpay AI Builder Internship 2026  
> **Track:** Track 3 — AI Revenue Recovery  
> **Core Motto:** *"Recover revenue intelligently. Not blindly."*  
> **Live Web Application:** [https://razorpay-buildathon-ivory.vercel.app](https://razorpay-buildathon-ivory.vercel.app)  
> **Live Backend API (Render):** [https://razorpay-buildathon-rvgj.onrender.com](https://razorpay-buildathon-rvgj.onrender.com)  
> **Target Demo Artifact:** [https://share.google/IhXXtpGBbnNE8J5DV](https://share.google/IhXXtpGBbnNE8J5DV)  
> **Tech Stack:** React 19 • TypeScript • Tailwind CSS v4 • FastAPI • LangGraph StateGraph • Celery + Redis • Supabase Auth & PostgreSQL • Razorpay API & Mock Sandbox • Gmail SMTP & HTTPS REST Relay • Google Gemini • Groq LPU • OpenRouter  

---

## 🎯 1. Executive Summary & Problem Statement

Subscription and SaaS businesses lose up to **9% of recurring revenue** to involuntary churn caused by payment failures (*soft declines, temporary card limits, credential expiration, network timeouts, and bank outages*).

Traditional dunning tools execute naive recovery routines:
- **Blind Retries**: Repeatedly charging cards without intelligence leads to customer frustration, high decline penalty fees, and card network rate-limiting.
- **Aggressive Debt-Collection Copy**: Generic, threatening dunning notices erode user trust and spike voluntary cancellations.
- **Disconnected Systems**: Lack of deterministic policy gates risks charging stolen or expired cards, creating chargebacks.

### The Solution: RecoverAI
**RecoverAI** replaces naive dunning with an **autonomous LangGraph-orchestrated state machine** that:
1. **Triages Failure Codes** into deterministic risk archetypes (*Soft Decline, Insufficient Funds, Expired Card, Network Timeout, Stolen/Hard Decline*).
2. **Evaluates Recovery Probability** via a calibrated multi-factor scoring model ($0.00 - 1.00$) factoring tenure, transaction history, decline count, and bank health.
3. **Enforces Hard Policy Invariants** (e.g., automatic lockout for stolen cards, mandatory operator review for amounts $>₹10,000$, forced customer dunning for expired credentials).
4. **Schedules Retries to Banking Liquidity Cycles** (e.g., salary days, morning clearing windows at 09:30 AM / 02:00 PM).
5. **Dispatches Empathetic Communications** via **Gmail SMTP & HTTPS REST Relay** (Port 587 STARTTLS / Port 443 HTTPS) with **cryptographically secure 1-click payment update links**.
6. **Dynamically Binds Recipient Addresses** to verified customer records (`payment.customer.email`) with zero administrative/demo fallback leakage.

---

## 🏛️ 2. Architectural Separation: Supabase Auth vs. Transactional Email

RecoverAI strictly enforces an architectural boundary separating user authentication from customer transactional business emails:

```
                          RECOVERAI
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        SUPABASE AUTH                 TRANSACTIONAL EMAIL
    (AUTHENTICATION ONLY)           (CUSTOMER DUNNING ONLY)
              │                               │
              ▼                               ▼
       Identity & Access               Business Emails
              │                               │
      ┌───────┴───────┐               ┌───────┴───────┐
      │               │               │               │
  Verify Email    Password         Payment        Recovery
  Admin Sign-In    Reset           Failure        Receipt
      │               │               │               │
      └───────────────┘               └───────────────┘
```

| Domain | Responsible Engine | Key Operations |
|---|---|---|
| **Authentication & Identity** | **Supabase Auth** | Admin registration, login, email verification, password reset, session/JWT token lifecycle, logout. Authentication emails are delivered **exclusively via Supabase Auth**. |
| **Transactional Customer Delivery** | **Central Email Service** | Payment failure dunning notices, smart retry alerts, 1-click customer payment update emails, recovery confirmation receipts, and Razorpay onboarding OTPs. Delivered via `smtp.gmail.com:587` with STARTTLS, `port 465` SSL, and `port 443` HTTPS REST API relay. |

---

## 📬 3. Dynamic Customer Recipient Resolution

RecoverAI enforces strict tenant isolation and dynamic customer record resolution:

```
Selected Failed Payment
        ↓
payment.customer_id
        ↓
payment.customer (Customer Record)
        ↓
payment.customer.email (e.g. rahul.test@gmail.com, priya.test@gmail.com, or real merchant customer)
        ↓
EmailService Delivery Engine
        ↓
Customer Inbox
```

### Safety Invariants:
1. **No Admin/Demo Leakage**: The authenticated merchant's email (`admin.email`) is **never** used as a fallback for customer recovery/dunning emails.
2. **Missing Customer Validation**: If `payment.customer.email` is missing, the backend immediately returns an explicit HTTP 400 error (`"No customer email found for payment <id>"`).
3. **Structured Safe Diagnostics**: All email dispatches log domain and event telemetry without exposing sensitive secrets:
   ```json
   {
     "event": "transactional_email",
     "payment_id": "pay_rzp_99201948",
     "customer_id": "cust_rahul_01",
     "recipient_source": "payment.customer.email",
     "recipient": "rahul.test@gmail.com",
     "recipient_domain": "gmail.com"
   }
   ```

---

## 🔄 4. LangGraph Autonomous Recovery State Machine

LangGraph is the **central deterministic state-machine workflow orchestrator** for RecoverAI. It executes a typed 7-node pipeline with deterministic safety policy gates:

```
Payment Failure / Razorpay Webhook
                ↓
             FastAPI
                ↓
    LangGraph Recovery Agent (StateGraph)
                ↓
  01. CLASSIFY FAILURE (classify_failure_node)
                ↓
  02. RECOVERY PROBABILITY (recovery_probability_node)
                ↓
  03. POLICY SAFETY GATE (policy_gate_node) [DETERMINISTIC INVARIANTS]
                ↓
  04. ACTION DECISION (decision_node)
                │
    ┌───────────┼───────────────────────────┬──────────────┐
    ▼           ▼                           ▼              ▼
  RETRY   CUSTOMER_ACTION              HUMAN_REVIEW       STOP
 (05A)       (05B)                        (05C)          (05D)
    │           │                           │              │
Razorpay   Gmail / HTTPS Relay         Admin Review   Safety Lock
    │           │                           │              │
    └───────────┼───────────────────────────┴──────────────┘
                ▼
  07. CLOSED-LOOP OUTCOME & TELEMETRY (outcome_node)
                ↓
         Multi-Tenant Relational Store
                ↓
      React 19 Real-Time Stream
```

### 7-Node Autonomous Pipeline:
1. **`classify_failure_node`**: Normalizes gateway error codes into failure archetypes (*Soft Decline, Insufficient Funds, Expired Card, Network Timeout, Stolen/Hard Decline*).
2. **`recovery_probability_node`**: Executes the trained **XGBoost Recovery Model** (`xgboost_v1`) with **Platt Scaling (Sigmoid Calibration)** across 11 point-in-time features, computing calibrated recovery probability ($0.00 – 1.00$) and extracting exact Shapley feature attributions via **SHAP TreeExplainer**.
3. **`policy_gate_node`**: Deterministic rule verification (Authoritative safety gates that override ML predictions):
   - *Stolen / Lost Cards* $\rightarrow$ Immediate Lockout (`STOP`).
   - *Card Expired* $\rightarrow$ Forced Customer Dunning (`CUSTOMER_ACTION`).
   - *Max Retries Exceeded (3)* $\rightarrow$ Final Grace Stop (`STOP`).
   - *High-Value ($>₹10,000$)* $\rightarrow$ Enforce Operator Review (`HUMAN_REVIEW`).
4. **`decision_node`**: Selects the optimal recovery pathway based on probability and policy safety gates.
5. **`retry_action_node`**: Schedules tokenized retry aligned with banking liquidity clearing cycles (e.g. 09:30 AM / 02:00 PM).
6. **`communication_node`**: Generates failure-specific copy via Google Gemini and dispatches secure 1-click update emails.
7. **`outcome_node`**: Updates payment status (`RECOVERED`, `ACTION_REQUIRED`, `RETRY_SCHEDULED`, `FAILED`), emits telemetry, and writes immutable audit trail logs.

> **XAI Invariant**: XGBoost estimates the probability that a failed payment can be recovered. SHAP provides local feature-level explanations for the model prediction. Deterministic safety policies remain authoritative and can override the model.

---

## 🎛️ 5. Provider Topology & Architecture Matrix

```
                        FASTAPI GATEWAY
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
          GEMINI AI       GROQ LPU        OPENROUTER
        (Intelligence)   (Conversational) (Fallback)
               │               │               │
               └───────────────┼───────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
           LANGGRAPH       SUPABASE       EMAIL ENGINE
         (State Machine)  (Audit/Data)   (Transactional)
               │               │
               ▼               │
        CELERY + REDIS         │
      (Scheduled Automation)   │
               │               │
           RAZORPAY ───────────┘
          (Payments)
```

| Provider / Layer | Service Implementation | Dedicated Responsibility |
|---|---|---|
| **Google Gemini** | [`gemini_service.py`](backend/app/services/gemini_service.py) | **Primary Intelligence Engine**: Contextual failure triage, recovery probability scoring, empathetic dunning copy generation, analytics interpretation, and policy decision explanations. |
| **Groq LPU** | [`groq_service.py`](backend/app/services/grok_service.py) | **Real-Time Conversational AI Copilot**: Powers the floating AI Assistant with sub-second response times and live database tool execution (`get_recovery_metrics`, `get_payment_detail`, `get_recovery_queue`, `get_policy_decision`). |
| **OpenRouter** | [`openrouter_service.py`](backend/app/services/openrouter_service.py) | **Secondary Fallback & Multi-Model Reasoning**: Automatic fallback if primary AI is unavailable. |
| **LangGraph** | [`graph.py`](backend/app/agent/graph.py) | **Autonomous Workflow Orchestration**: 7-node deterministic recovery state machine with policy safety gates. |
| **Celery + Redis** | [`celery_app.py`](backend/app/celery_app.py) / [`recovery_tasks.py`](backend/app/tasks/recovery_tasks.py) | **Background & Scheduled Automation Layer**: Non-blocking scheduled execution of approved payment retries, transactional dunning email dispatch, and closed-loop outcome processing. |
| **FastAPI** | [`endpoints.py`](backend/app/api/endpoints.py) | **Security & Policy Enforcement**: Authorizes requests, manages background recovery jobs, and enforces deterministic invariants. |
| **Supabase Auth** | [`auth.py`](backend/app/api/auth.py) | **Authentication & Identity**: User registration, login, email verification, password reset, session/JWT management. |
| **Supabase DB** | [`store.py`](backend/app/db/store.py) | **Source of Truth**: Multi-tenant relational schema and immutable audit logs. |
| **Email Service** | [`email_service.py`](backend/app/services/email_service.py) | **Dual-Transport Delivery**: Port 587 STARTTLS, Port 465 SSL, and Port 443 HTTPS REST API relay with cryptographically signed 1-click update links. |
| **Razorpay** | [`razorpay_provider.py`](backend/app/services/payment/razorpay_provider.py) | **Payment Gateway**: Multi-tenant OAuth integration, webhook signature verification, and tokenized subscription charges. |

---

## 🚀 6. Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: v3.10+ (tested on Python 3.10 – 3.14)

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server on port 8000
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Backend Environment Configuration (`backend/.env`)
```env
# Mode
IS_DEMO_MODE=true
FRONTEND_PUBLIC_URL=https://share.google/IhXXtpGBbnNE8J5DV

# Supabase Auth & PostgreSQL
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Delivery (Gmail SMTP / Brevo HTTPS Relay)
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
GMAIL_SMTP_USER=your_gmail@gmail.com
GMAIL_SMTP_PASSWORD=your_gmail_app_password
GMAIL_SENDER_EMAIL=your_gmail@gmail.com
GMAIL_SENDER_NAME=RecoverAI
BREVO_API_KEY=your_brevo_api_key

# AI Intelligence Providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Razorpay Integration (Test or Live)
RAZORPAY_KEY_ID=rzp_test_TRvxs42XlaI4PB
RAZORPAY_KEY_SECRET=gG9y0oZk8YlD46t1wO7gM9x1
RAZORPAY_WEBHOOK_SECRET=mock_webhook_secret
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit: **`http://localhost:5173`**

### 5. Frontend Environment Configuration (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Run Automated Test Suite
```bash
source backend/venv/bin/activate
pytest backend/tests/
```
*(All 61 automated test cases pass with 100% green status across state graph, email delivery, Celery/Redis automation, and Razorpay flows)*

---

## 🧪 7. Automated Test Suite Matrix

```
======================== 61 passed, 1 warning in 47.96s ========================
```

| Test Suite | File | Verified Features |
|---|---|---|
| **Core Backend & Invariants** | `test_backend.py` (10 tests) | LangGraph StateGraph execution, recovery probability calibration, deterministic safety gates, high-value threshold checks. |
| **Celery & Redis Automation** | `test_celery_redis_automation.py` (16 tests) | Background task registration, scheduled retry idempotency, async dunning dispatch, Celery task payload sanitization. |
| **Email System & Delivery** | `test_email_system.py` (16 tests) | Dynamic customer email resolution, responsive HTML template generation, HTTPS relay fallback, diagnostic logging. |
| **Razorpay Integration & OTP** | `test_razorpay_verification.py` (10 tests) | Multi-tenant onboarding OTP delivery, webhook HMAC signature validation, masked credential display. |
| **Explainable AI (SHAP & LIME)** | `test_shap_xai.py` (9 tests) | Multi-factor feature importance, SHAP score explanations, confidence intervals, audit logging. |

---

## 🔒 8. Security & PCI-DSS Compliance Invariants

1. **Zero Raw Card Storage**: No raw PAN, CVV, or cardholder credentials are ever stored (tokenized identifiers only).
2. **Hard Deterministic Safety Gates**: Stolen/lost cards and expired credentials cannot be retried under any circumstance.
3. **Human-in-the-Loop Safeguards**: High-value transactions ($>₹10,000$) require human operator sign-off before retrying.
4. **Supabase Auth Isolation**: Dedicated user authentication system with email verification, password reset, and encrypted sessions.
5. **Masked Diagnostics**: No internal stack traces, API keys, or SMTP passwords are ever exposed in user-facing responses or error messages.

---

## 📄 9. License

Developed for the **Razorpay AI Builder Internship 2026** (Track 3 — AI Revenue Recovery).  
Licensed under the **MIT License**.
