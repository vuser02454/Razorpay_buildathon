# ⚡ RecoverAI — Autonomous AI Revenue Recovery Platform

> **Hackathon:** Razorpay AI Builder Internship 2026  
> **Track:** Track 3 — AI Revenue Recovery  
> **Core Motto:** *"Recover revenue intelligently. Not blindly."*  
> **Live Web Application:** [https://razorpay-buildathon-ivory.vercel.app](https://razorpay-buildathon-ivory.vercel.app)  
> **Target Demo Artifact:** [https://share.google/IhXXtpGBbnNE8J5DV](https://share.google/IhXXtpGBbnNE8J5DV)  
> **Tech Stack:** React 19 • TypeScript • Tailwind CSS v4 • FastAPI • LangGraph StateGraph • Celery + Redis • Supabase Auth & PostgreSQL • Razorpay API & Mock Sandbox • Gmail SMTP Relay • Google Gemini • Groq LPU • OpenRouter  

---

## 🎯 Executive Summary & Problem Statement

Subscription and SaaS businesses lose up to **9% of recurring revenue** to involuntary churn caused by payment failures (*soft declines, temporary card limits, credential expiration, network timeouts, and bank outages*). 

Traditional dunning tools execute naive recovery routines:
- **Blind Retries**: Repeatedly charging cards without intelligence leads to customer frustration, high decline penalty fees, and card network rate-limiting.
- **Aggressive Debt-Collection Copy**: Generic, threatening dunning notices erode user trust and spike voluntary cancellations.
- **Disconnected Systems**: Lack of deterministic policy gates risks charging stolen or expired cards, creating chargebacks.

### The Solution: RecoverAI
**RecoverAI** replaces naive dunning with an **autonomous LangGraph-orchestrated state machine** that:
1. **Triages Failure Codes** into deterministic risk archetypes (*Soft Decline, Insufficient Funds, Expired Card, Network Timeout, Stolen/Hard Decline*).
2. **Evaluates Recovery Probability** via a calibrated multi-factor scoring model ($0.00 - 1.00$) factoring tenure, transaction history, decline count, and bank health.
3. **Enforces Hard Policy Invariants** (e.g. automatic lockout for stolen cards, mandatory operator review for amounts $>₹10,000$, forced customer dunning for expired credentials).
4. **Schedules Retries to Banking Liquidity Cycles** (e.g., salary days, morning clearing windows at 09:30 AM / 02:00 PM).
5. **Dispatches Empathetic Communications** via **Gmail SMTP** (Port 587 STARTTLS) with **cryptographically secure 1-click payment update links**.

---

## 🏛️ Strict System Separation: Supabase Auth vs. Gmail SMTP

RecoverAI strictly enforces an architectural boundary separating user authentication from transactional business emails:

```
                          RECOVERAI
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        SUPABASE AUTH                     GMAIL SMTP
    (AUTHENTICATION ONLY)           (TRANSACTIONAL ONLY)
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
| **Transactional Recovery Delivery** | **Gmail SMTP Relay** | Payment failure dunning notices, smart retry alerts, 1-click customer payment update emails, recovery confirmation receipts, and Razorpay onboarding OTPs. Delivered via `smtp.gmail.com:587` with STARTTLS. |

---

## 🔄 LangGraph Autonomous Recovery Architecture

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
Razorpay   Gmail SMTP (Port 587)       Admin Review   Safety Lock
    │           │                           │              │
    └───────────┼───────────────────────────┴──────────────┘
                ▼
  07. CLOSED-LOOP OUTCOME & TELEMETRY (outcome_node)
                ↓
         Multi-Tenant Relational Store
                ↓
      React 19 Real-Time Stream
```

### 7-Node Autonomous Pipeline

1. **`classify_failure_node`**: Normalizes gateway error codes into failure archetypes (*Soft Decline, Insufficient Funds, Expired Card, Network Timeout, Stolen/Hard Decline*).
2. **`recovery_probability_node`**: Computes recovery probability ($0.00 – 1.00$) and confidence score using calibrated weights across amount risk tier, decline history, time-of-month, and past success rate.
3. **`policy_gate_node`**: Deterministic rule verification:
   - *Stolen / Lost Cards* $\rightarrow$ Immediate Lockout (`STOP`).
   - *Card Expired* $\rightarrow$ Forced Customer Dunning (`CUSTOMER_ACTION`).
   - *Max Retries Exceeded (3)* $\rightarrow$ Final Grace Stop (`STOP`).
   - *High-Value ($>₹10,000$)* $\rightarrow$ Enforce Operator Review (`HUMAN_REVIEW`).
4. **`decision_node`**: Selects the optimal recovery pathway based on probability and policy safety gates.
5. **`retry_action_node`**: Schedules tokenized retry aligned with banking liquidity clearing cycles (e.g. 09:30 AM / 02:00 PM).
6. **`communication_node`**: Generates failure-specific copy via Google Gemini and dispatches secure 1-click update emails via Gmail SMTP (`smtp.gmail.com:587`, STARTTLS).
7. **`outcome_node`**: Updates payment status (`RECOVERED`, `ACTION_REQUIRED`, `RETRY_SCHEDULED`, `FAILED`), emits telemetry, and writes immutable audit trail logs.

---

## 🎛️ Provider Topology & Architecture Matrix

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
           LANGGRAPH       SUPABASE       GMAIL SMTP
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
| **Google Gemini** | [`gemini_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/gemini_service.py) | **Primary Intelligence Engine**: Contextual failure triage, recovery probability scoring, empathetic dunning copy generation, analytics interpretation, and policy decision explanations. |
| **Groq LPU** | [`groq_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/grok_service.py) | **Real-Time Conversational AI Copilot**: Powers the floating AI Assistant with sub-second response times and live database tool execution (`get_recovery_metrics`, `get_payment_detail`, `get_recovery_queue`, `get_policy_decision`). |
| **OpenRouter** | [`openrouter_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/openrouter_service.py) | **Secondary Fallback & Multi-Model Reasoning**: Automatic fallback if primary AI is unavailable. |
| **LangGraph** | [`graph.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/agent/graph.py) | **Autonomous Workflow Orchestration**: 7-node deterministic recovery state machine with policy safety gates (not a conversational bot). |
| **Celery + Redis** | [`celery_app.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/celery_app.py) / [`recovery_tasks.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/tasks/recovery_tasks.py) | **Background & Scheduled Automation Layer**: Non-blocking scheduled execution of approved payment retries, transactional dunning email dispatch, and closed-loop outcome processing with graceful fallback. |
| **FastAPI** | [`endpoints.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/api/endpoints.py) | **Security & Policy Enforcement**: Authorizes requests, manages background recovery jobs, and enforces deterministic invariants. |
| **Supabase Auth** | [`auth.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/api/auth.py) | **Authentication & Identity**: User registration, login, email verification, password reset, session/JWT management. |
| **Supabase DB** | [`store.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/db/store.py) | **Source of Truth**: Multi-tenant relational schema and immutable audit logs. |
| **Gmail SMTP** | [`email_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/email_service.py) | **Transactional Delivery**: Port 587 (STARTTLS) transactional dunning email dispatch with cryptographically signed 1-click update links. |
| **Razorpay** | [`razorpay_provider.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/payment/razorpay_provider.py) | **Payment Gateway**: Multi-tenant OAuth integration and tokenized subscription smart charges. |

---

## 📧 Gmail SMTP & 1-Click Customer Payment Update

```
Payment Failure Event
        ↓
FastAPI Backend
        ↓
LangGraph Recovery Agent
        ↓
Deterministic Policy Safety Gate
        ↓
Google Gemini Copy Engine
        ↓
Gmail SMTP Relay (Port 587, STARTTLS)
        ↓
Customer Email with Secure 1-Click Update Link
        ↓
Customer Payment Update Page (/update-payment?payment_id=...&token=...)
        ↓
Payment Recovered & Subscription Active!
```

- **Gmail SMTP Relay**: Dispatches live transactional dunning notices via Python's standard library `smtplib` + `STARTTLS` on port 587.
- **Cryptographic 1-Click Links**: Includes HMAC-signed short-lived token validating payment authorization without exposing sensitive customer credentials or account details.
- **Instant Recovery**: Updating the payment method automatically transitions state to `RECOVERED` and updates recovered revenue metrics in real time.

---

## 🎬 Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: v3.10+ (tested on Python 3.10 - 3.14)

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

# Gmail SMTP Relay (Transactional Business Emails Only)
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
GMAIL_SMTP_USER=your_gmail@gmail.com
GMAIL_SMTP_PASSWORD=your_gmail_app_password
GMAIL_SENDER_EMAIL=your_gmail@gmail.com
GMAIL_SENDER_NAME=RecoverAI

# AI Intelligence Providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Razorpay Integration (Mock or Live)
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
cd backend
./venv/bin/pytest
```
*(All 59 automated test cases pass with 100% green status across state graph, email delivery, Celery/Redis automation, and Razorpay flows)*

---

## 🔒 Security & PCI-DSS Compliance Invariants

1. **Zero Raw Card Storage**: No raw PAN, CVV, or cardholder credentials are ever stored (tokenized identifiers only).
2. **Hard Deterministic Safety Gates**: Stolen/lost cards and expired credentials cannot be retried under any circumstance.
3. **Human-in-the-Loop Safeguards**: High-value transactions ($>₹10,000$) require human operator sign-off before retrying.
4. **Supabase Auth Isolation**: Dedicated user authentication system with email verification, password reset, and encrypted sessions.
5. **Masked Diagnostics**: No internal stack traces, API keys, or SMTP passwords are ever exposed in user-facing responses or error messages.
