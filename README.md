# ⚡ RecoverAI — Autonomous AI Revenue Recovery Platform

> **Hackathon:** Razorpay AI Builder Internship 2026  
> **Track:** Track 3 — AI Revenue Recovery  
> **Core Motto:** *"Recover revenue intelligently. Not blindly."*  
> **Tech Stack:** React 19 • TypeScript • Tailwind CSS v4 • FastAPI • LangGraph StateGraph • Supabase PostgreSQL • Razorpay API & Mock Sandbox • Brevo SMTP Relay • Google Gemini • Groq LPU • OpenRouter  

---

## 🎯 Executive Summary & Problem

Subscription businesses lose up to 9% of their recurring revenue to failed payments. Naive recovery systems blindly retry failed cards repeatedly or spam customers with aggressive debt collection messages. This damages customer trust, escalates merchant decline penalty fees, and violates card network retry constraints.

**RecoverAI** replaces naive retries with a **LangGraph-orchestrated autonomous decision engine** that triages failure codes, evaluates recovery probability via feature-weighted models, enforces deterministic safety policy gates, schedules retries to align with issuer liquidity clearing cycles, and dispatches empathetic, failure-specific communications via **Brevo SMTP** with **1-click payment update links** when customer action is required.

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
Razorpay   Brevo SMTP (Port 587)       Admin Review   Safety Lock
    │           │                           │              │
    └───────────┼───────────────────────────┴──────────────┘
                ▼
  07. CLOSED-LOOP OUTCOME & TELEMETRY (outcome_node)
                ↓
         Supabase Storage (Tenant Isolated)
                ↓
      React Dashboard Stream
```

### Modular 7-Node State Machine ([`backend/app/agent/nodes/`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/agent/nodes/))

1. **`classify_failure.py`**: Categorizes raw gateway decline signals (`SOFT_DECLINE`, `HARD_DECLINE`, `CREDENTIAL_ISSUE`, `NETWORK_TIMEOUT`, `AUTH_REQUIRED`, `FRAUD_RISK`).
2. **`recovery_probability.py`**: Feature-weighted probability scoring + optimal clearing window prediction (`09:30 AM`).
3. **`policy_gate.py`**: **Authoritative Deterministic Python Rules**:
   - `STOLEN / LOST / FRAUD CARD` $\rightarrow$ `BLOCK_RETRY` (Forced STOP)
   - `EXPIRED CARD` $\rightarrow$ `CUSTOMER_ACTION_REQUIRED`
   - `RETRY COUNT >= MAX_RETRIES` $\rightarrow$ `STOP_RETRIES`
   - `AMOUNT > ₹10,000` $\rightarrow$ `HUMAN_REVIEW`
   - `SOFT DECLINE + HIGH PROBABILITY` $\rightarrow$ `RETRY_ELIGIBLE`
4. **`decision.py`**: Synthesizes probability and policy into `RETRY`, `CUSTOMER_ACTION`, `HUMAN_REVIEW`, or `STOP`.
5. **`retry_action.py`**: Interfaces with Razorpay/Mock provider to register scheduled retries without storing raw card PAN/CVV.
6. **`communication.py`**: Generates failure-specific copy via Google Gemini and dispatches 1-click update emails via Brevo SMTP (`smtp-relay.brevo.com:587`, STARTTLS).
7. **`outcome.py`**: Records tenant-isolated execution telemetry and updates persistent storage.

### 🌟 Interactive LangGraph Visualizer & Node Inspector
- **1-Click Modal Trigger:** Click **"View Full Graph →"** in the *LangGraph Execution Stream* or click any of the 7 compact stream nodes.
- **Visual Diagram:** Animated flow tracing from `START` $\rightarrow$ `Classify` $\rightarrow$ `Probability` $\rightarrow$ `Policy Gate` $\rightarrow$ `Decision` $\rightarrow$ `Conditional Branch (Retry / Brevo / Human Review / Safety Stop)` $\rightarrow$ `Outcome` $\rightarrow$ `END`.
- **Node Telemetry Inspector:** Click any node to inspect real inputs, JSON outputs, duration in milliseconds, and authoritative labels (**"DETERMINISTIC POLICY"** vs **"AI REASONING"**).
- **Dynamic Context:** Adapts automatically to the selected payment (*Rahul Sharma* = Soft Decline $\rightarrow$ Retry; *Ananya Rao* = Expired Card $\rightarrow$ Brevo Email; *Enterprise Customer* = High Value $\rightarrow$ Human Review).

---

## 🧠 Clean Separation of AI Providers (AI Router Architecture)

RecoverAI enforces strict non-overlapping responsibilities across all AI and infrastructure providers:

```
                         RECOVERAI
                             │
                        AI ROUTER
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
 GOOGLE GEMINI             GROQ               OPENROUTER
(Platform Intelligence) (Real-Time Copilot)   (Fallback Reasoning)
 • analyze_failure()     • chat_assistant()    • strategic_reasoning()
 • recovery_probability  • Live DB Tools       • Multi-Model Failover
 • generate_dunning()    • Controlled Actions
 • explain_policy()
 • explain_analytics()
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                          FASTAPI
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          LANGGRAPH       SUPABASE        BREVO
        (State Machine)  (Audit/Data)   (SMTP Relay)
              │
          RAZORPAY
         (Payments)
```

### AI Responsibility Matrix

| Provider / Layer | Service File | Dedicated Responsibility |
|---|---|---|
| **Google Gemini** | [`gemini_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/gemini_service.py) | **Primary Website Intelligence Engine**: Contextual failure triage, recovery probability scoring, empathetic dunning copy generation, analytics interpretation, and policy decision explanations. |
| **Groq LPU** | [`groq_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/grok_service.py) | **Real-Time Conversational AI Copilot**: Powers the floating AI Assistant with sub-second response times and live database tool execution (`get_recovery_metrics`, `get_payment_detail`, `get_recovery_queue`, `get_policy_decision`). |
| **OpenRouter** | [`openrouter_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/openrouter_service.py) | **Secondary Fallback & Multi-Model Reasoning**: Automatic fallback if primary AI is unavailable, plus advanced strategic reasoning. |
| **LangGraph** | [`graph.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/agent/graph.py) | **Autonomous Workflow Orchestration**: 7-node deterministic recovery state machine with policy safety gates (not a chatbot). |
| **FastAPI** | [`endpoints.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/api/endpoints.py) | **Security & Policy Enforcement**: Authorizes requests, executes retries, and enforces deterministic invariants. |
| **Supabase** | [`store.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/db/store.py) | **Source of Truth**: Multi-tenant relational schema and immutable audit logs. |
| **Brevo SMTP** | [`email_service.py`](file:///Users/vvijwal01gmail.com/recoverAI/backend/app/services/email_service.py) | **Transactional Delivery**: Port 587 (STARTTLS) dunning email dispatch with 1-click update links. |

---

## 🔐 Authentication & Multi-Tenant Data Isolation

The application enforces **Authentication as the First Screen** when opening the platform:

```
                          OPEN APPLICATION
                                 ↓
                     MANDATORY LOGIN SCREEN
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
   1-CLICK DEMO ADMIN                          NEW ADMIN REGISTRATION
(Continue with Demo Account)                    (Create Admin Account)
           │                                           │
           ▼                                           ▼
  FULL REALISTIC DATA                         ZERO-STATE WORKSPACE
• Pre-populated Failed Queue                • 0 Failed Payments
• 7-Node LangGraph Traces                   • ₹0 Recovered Revenue
• A/B Testing (+24.9% Uplift)               • 0% Recovery Rate
• Brier Calibration Metrics                 • Run Test Recovery Action
           │                                           │
           └─────────────────────┬─────────────────────┘
                                 ▼
                     RECOVERY CONTROL CENTER
                     (Strict Tenant Isolation)
```

1. **Demo Admin Account (For Hackathon Judges):**
   - Click **"Continue with Demo Account"** for 1-click instant login as `demo@recoverai.ai` (`RecoverAI Demo Admin`).
   - Pre-populated with real transactions (*Rahul Sharma ₹2,000, Priya Menon ₹4,500, Arjun Mehta ₹12,500, Sneha Rao ₹3,200*), 7-node LangGraph execution traces, and A/B testing uplift.
2. **New Admin Account (Multi-Tenant Isolation):**
   - Register any new account (e.g. *Karan Patel* / `karan@fintech.io`).
   - **Guaranteed Zero-State**: Newly created admins start with **0 failed payments, ₹0 recovered revenue, 0% recovery rate, and an empty queue**. Includes a **"Run a Test Recovery"** simulation visible only to that admin.
3. **Backend Token Enforcement:**
   - Every API request is signed with `Authorization: Bearer <token>` and `X-Admin-Id`.

---

## 📧 Brevo SMTP & 1-Click Customer Payment Update

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
Brevo SMTP Relay (Port 587, STARTTLS)
        ↓
Customer Email with 1-Click Update Link
        ↓
Customer Payment Update Page (/update-payment)
        ↓
Payment Recovered & Subscribed Active!
```

- **Brevo SMTP Relay**: Dispatches live transactional dunning notices via Python's standard library `smtplib` + `STARTTLS` on port 587.
- **1-Click Customer Update Page**: Direct web route (`/update-payment?payment_id=...`) allowing customers to securely update their card, UPI, or NetBanking method without needing merchant login.
- **Instant Recovery**: Updating the payment automatically updates subscription status to `RECOVERED` and increments recovered revenue in real time.

---

## 🎬 2-Minute Hackathon Demo Script (For Judges)

| Time | Step | What to Observe |
|---|---|---|
| **0:00** | Open `http://localhost:5175` | **Login First Screen** appears. No dashboard data is exposed before authentication. |
| **0:10** | Click **"Continue with Demo Account"** | 1-Click login as Demo Admin $\rightarrow$ Instantly opens the populated **Recovery Control Center**. |
| **0:25** | Inspect Recovery Queue | View transactions: *Rahul Sharma (₹2,000, Soft Decline, 74%)*, *Ananya Rao (₹8,500, Expired Card, 12%)*, *Enterprise Customer (₹18,000, Human Review)*. |
| **0:45** | Open **AI Decision Drawer** | Click *Rahul Sharma* $\rightarrow$ Inspect 74% probability, decision factors (`✓ Soft decline`, `✓ Strong history`), and 7-node LangGraph trace. |
| **1:00** | Click **"Preview Email"** $\rightarrow$ **"Send Recovery Email"** | Dispatches live transactional dunning email via **Brevo SMTP** straight to customer inbox. |
| **1:15** | Open Email & Click **"Update Payment Method"** | Opens the dedicated customer payment update page $\rightarrow$ enter card $\rightarrow$ click Update $\rightarrow$ instant confetti & status changes to `RECOVERED`. |
| **1:30** | Open **AI Assistant** (Groq) | Ask: *"Why did Rahul's payment fail?"* $\rightarrow$ Groq retrieves live database record and responds in sub-second time. |
| **1:45** | Review **AI Status Panel** | Inspect live subsystem statuses: Google Gemini, Groq, OpenRouter, LangGraph, Brevo SMTP, Supabase. |
| **2:00** | Test **Data Isolation** | Click Logout $\rightarrow$ Click **"Create Admin Account"** $\rightarrow$ Verify dashboard starts with **ZERO data** and displays *"Run a Test Recovery"*. |

---

## ⚡ Quick Start Guide

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

# Brevo SMTP Relay
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_login
BREVO_SMTP_PASSWORD=your_brevo_smtp_key
BREVO_SENDER_EMAIL=your_verified_sender@example.com
BREVO_SENDER_NAME=RecoverAI

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

Visit: **`http://localhost:5175`** (Vite default or port displayed in terminal).

### 5. Run Automated Test Suite
```bash
source backend/venv/bin/activate
PYTHONPATH=backend pytest backend/tests/test_backend.py
```
*(All 9 automated tests pass, covering failure classification, LangGraph execution, deterministic safety policies, Brevo SMTP email service, AI Router intelligence, Groq tool-calling with tenant validation, OpenRouter fallback, and provider health diagnostics).*

---

## 📡 API Reference & AI Endpoints

### LangGraph & Recovery Workflow Endpoints
- `POST /api/recovery/run` — Executes the 7-node LangGraph state machine and returns auditable execution trace.
- `POST /api/recovery/execute` — Authorizes and executes the approved recovery action via Razorpay/Mock provider.
- `POST /api/recovery/retry` — Triggers an immediate retry attempt with policy check.
- `POST /api/recovery/send-email` — Dispatches transactional dunning email via Brevo SMTP.

### Dedicated AI Router Endpoints
- `POST /api/ai/analyze-payment` — Contextual failure triage powered by Google Gemini (OpenRouter fallback).
- `POST /api/ai/recovery-probability` — Feature-weighted probability scoring.
- `POST /api/ai/generate-dunning` — Empathetic, failure-specific email copy generation.
- `POST /api/ai/explain-policy` — Natural-language explanation of deterministic safety rules.
- `POST /api/ai/analyze-analytics` — Automated recovery narrative & A/B testing uplift interpretation.
- `POST /api/assistant/chat` — Sub-second conversational assistant powered by Groq LPU with tenant-isolated database tool execution.
- `GET /api/ai/audit-logs` — Immutable audit log of all AI provider operations stored in Supabase.

### System & Provider Health Diagnostics
- `GET /api/system/status` & `GET /api/ai/status` — Live multi-subsystem topology status.
- `GET /api/health/gemini` — Gemini connectivity check.
- `GET /api/health/groq` — Groq LPU connectivity check.
- `GET /api/health/openrouter` — OpenRouter fallback standby check.
- `GET /api/health/langgraph` — 7-node autonomous workflow engine status.
- `GET /api/health/brevo` — Port 587 STARTTLS SMTP relay status.
- `GET /api/health/supabase` — PostgreSQL relational database sync status.

---

## 🔒 Security & PCI-DSS Compliance
- **Zero Raw Card Storage:** No raw PAN or CVV is ever stored (tokenized customer identifiers only).
- **Hard Safety Invariants:** Stolen/lost cards and expired credentials cannot be retried.
- **Human-in-the-Loop:** High-value transactions (>₹10,000) require operator review.
- **Supabase PostgreSQL:** Row-Level Security (RLS) policies and immutable audit logs.
- **Zero Credential Exposure:** SMTP credentials and API keys remain strictly server-side.
