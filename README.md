# ⚡ RecoverAI — Autonomous AI Revenue Recovery Platform

> **Hackathon:** Razorpay AI Builder Internship 2026  
> **Track:** Track 3 — AI Revenue Recovery  
> **Core Motto:** *"Recover revenue intelligently. Not blindly."*  
> **Tech Stack:** React 19 • TypeScript • Tailwind CSS v4 • FastAPI • LangGraph StateGraph • Supabase Auth & PostgreSQL • Razorpay API & Mock Sandbox • Gmail SMTP Relay • Google Gemini • Groq LPU • OpenRouter  

---

## 🎯 Executive Summary & Problem

Subscription businesses lose up to 9% of their recurring revenue to failed payments. Naive recovery systems blindly retry failed cards repeatedly or spam customers with aggressive debt collection messages. This damages customer trust, escalates merchant decline penalty fees, and violates card network retry constraints.

**RecoverAI** replaces naive retries with a **LangGraph-orchestrated autonomous decision engine** that triages failure codes, evaluates recovery probability via feature-weighted models, enforces deterministic safety policy gates, schedules retries to align with issuer liquidity clearing cycles, and dispatches empathetic, failure-specific communications via **Gmail SMTP** with **cryptographically secure 1-click payment update links** when customer action is required.

---

## 🏛️ Strict System Separation: Supabase Auth vs. Gmail SMTP

RecoverAI enforces a strict architectural boundary between user authentication and business transactional communications:

```
                    RECOVERAI
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
    SUPABASE AUTH                 GMAIL SMTP
(AUTHENTICATION ONLY)       (TRANSACTIONAL ONLY)
          │                           │
          ▼                           ▼
   Identity & Sessions         Business Emails
          │                           │
    ┌─────┴──────┐              ┌─────┴──────┐
    │            │              │            │
 Verify Email  Password       Payment      Recovery
 Login/Session   Reset        Failure      Success
    │            │              │            │
    └────────────┘              └────────────┘
```

1. **Supabase Auth — Authentication ONLY**
   - Handles Admin registration, login, email verification, password reset, session/JWT lifecycle, and logout.
   - All authentication emails (verification links, password reset links) are sent **exclusively by Supabase Auth**.
   - No custom password/token authentication system.

2. **Gmail SMTP — Transactional Emails ONLY**
   - Handles customer payment failure notices, smart retry notifications, 1-click payment update requests, recovery success receipts, and merchant onboarding OTPs.
   - Dispatched exclusively via `backend/app/services/email_service.py` over Gmail SMTP (Port 587 STARTTLS).
   - Zero authentication tokens or passwords dispatched over this channel.

---

## 🔄 LangGraph Autonomous Recovery Architecture

LangGraph is the **central state-machine workflow orchestrator** for RecoverAI (not a conversational chatbot). It executes a deterministic 7-node pipeline with typed state and conditional routing:

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
         Supabase Storage (Tenant Isolated)
                ↓
      React Dashboard Stream
```

### 7-Node Autonomous Graph Implementation:

1. **`classify_failure_node`**: Normalizes gateway error codes into failure archetypes (*Soft Decline, Insufficient Funds, Expired Card, Network Timeout, Stolen/Hard Decline*).
2. **`recovery_probability_node`**: Computes recovery probability (0.00 – 1.00) and confidence score using calibrated weights across amount, decline history, time-of-month, and past success rate.
3. **`policy_gate_node`**: Deterministic rule verification:
   - *Stolen / Lost Cards* $\rightarrow$ Immediate Lockout (`STOP`).
   - *Card Expired* $\rightarrow$ Forced Customer Dunning (`CUSTOMER_ACTION`).
   - *Max Retries Exceeded (3)* $\rightarrow$ Final Grace Stop (`STOP`).
   - *High-Value (>₹10,000)* $\rightarrow$ Enforce Operator Review (`HUMAN_REVIEW`).
4. **`decision_node`**: Determines optimal path based on probability and policy outcomes.
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

### Responsibility & Architecture Matrix

| Provider / Layer | Service File | Dedicated Responsibility |
|---|---|---|
| **Google Gemini** | [`gemini_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/gemini_service.py) | **Primary Website Intelligence Engine**: Contextual failure triage, recovery probability scoring, empathetic dunning copy generation, analytics interpretation, and policy decision explanations. |
| **Groq LPU** | [`groq_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/grok_service.py) | **Real-Time Conversational AI Copilot**: Powers the floating AI Assistant with sub-second response times and live database tool execution (`get_recovery_metrics`, `get_payment_detail`, `get_recovery_queue`, `get_policy_decision`). |
| **OpenRouter** | [`openrouter_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/openrouter_service.py) | **Secondary Fallback & Multi-Model Reasoning**: Automatic fallback if primary AI is unavailable. |
| **LangGraph** | [`graph.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/agent/graph.py) | **Autonomous Workflow Orchestration**: 7-node deterministic recovery state machine with policy safety gates (not a chatbot). |
| **Celery + Redis** | [`celery_app.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/celery_app.py) / [`recovery_tasks.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/tasks/recovery_tasks.py) | **Background & Scheduled Automation Layer**: Non-blocking scheduled execution of approved payment retries, transactional dunning email dispatch, and closed-loop outcome processing. |
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
- **Cryptographic 1-Click Links**: Includes HMAC-signed token validating payment authorization without exposing sensitive account data.
- **Instant Recovery**: Updating the payment method automatically updates status to `RECOVERED` and increments recovered revenue in real time.

---

## 🎬 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: v3.10+

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server on port 8000
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Environment Configuration (`backend/.env`)
```env
IS_DEMO_MODE=true

# Public Supabase credentials for auth & data sync
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Gmail SMTP Relay (Transactional Business Emails Only)
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
GMAIL_SMTP_USER=your_gmail_address@gmail.com
GMAIL_SMTP_PASSWORD=your_gmail_app_password
GMAIL_SENDER_EMAIL=your_gmail_address@gmail.com
GMAIL_SENDER_NAME=RecoverAI

# AI LLM Providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit: **`http://localhost:5173`**

### 5. Run Automated Test Suite
```bash
source backend/venv/bin/activate
cd backend
./venv/bin/pytest
```
*(All 59 automated tests pass with 100% green status)*

---

## 🔒 Security & PCI-DSS Compliance
- **Zero Raw Card Storage:** No raw PAN or CVV is ever stored (tokenized customer identifiers only).
- **Hard Safety Invariants:** Stolen/lost cards and expired credentials cannot be retried.
- **Human-in-the-Loop:** High-value transactions (>₹10,000) require operator review.
- **Supabase Auth Exclusive:** Dedicated auth with email verification and password reset.
- **Zero Credential Exposure:** SMTP credentials and API keys remain strictly server-side.
