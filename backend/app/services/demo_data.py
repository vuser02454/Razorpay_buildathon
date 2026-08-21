import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from app.models.schemas import (
    Customer, PaymentMethod, Payment, PaymentFailure, AIDecision, DecisionFactors,
    FailureType, RecoveryAction, PaymentStatus, CustomerSegment, RetryAttempt,
    DunningEvent, WorkflowStep
)

# Realistic Indian and Global Customer Names
NAMES = [
    ("Rahul Sharma", "rahul.sharma@techinnovate.in", "+91 98201 44521", "IN", CustomerSegment.PRO, 28000.0, 14, 0.94),
    ("Priya Venkatesh", "priya.v@zenithcloud.io", "+91 99402 11849", "IN", CustomerSegment.ENTERPRISE, 64000.0, 22, 0.97),
    ("Ananya Patel", "ananya.patel@designkraft.co", "+91 98791 22301", "IN", CustomerSegment.STARTER, 9999.0, 6, 0.88),
    ("Amitabh Mukherjee", "amitabh@mukherjeelabs.org", "+91 98310 99402", "IN", CustomerSegment.PRO, 36000.0, 18, 0.92),
    ("Sneha Deshmukh", "sneha.d@fintechgrowth.in", "+91 98220 55194", "IN", CustomerSegment.PRO, 21000.0, 9, 0.91),
    ("Vikram Singhania", "vikram@singhaniagroup.com", "+91 98110 33481", "IN", CustomerSegment.ENTERPRISE, 85000.0, 28, 0.98),
    ("Rohan Dasgupta", "rohan.d@creatorhub.net", "+91 98450 77123", "IN", CustomerSegment.STARTER, 7500.0, 4, 0.85),
    ("Deepika Nair", "deepika.nair@healthpulse.ai", "+91 94470 66320", "IN", CustomerSegment.PRO, 31000.0, 12, 0.93),
    ("Karan Malhotra", "karan@malhotracapital.in", "+91 98100 88219", "IN", CustomerSegment.ENTERPRISE, 55000.0, 16, 0.95),
    ("Pooja Sundaram", "pooja@cloudmatrix.co", "+91 99440 22718", "IN", CustomerSegment.PRO, 19500.0, 8, 0.90),
    ("Siddharth Roy", "siddharth@edutech.org", "+91 98200 44102", "IN", CustomerSegment.STARTER, 11000.0, 7, 0.87),
    ("Tanvi Joshi", "tanvi.j@brandhive.in", "+91 98230 11982", "IN", CustomerSegment.PRO, 24500.0, 11, 0.92),
    ("Arjun Reddy", "arjun.reddy@hyderabaddevs.com", "+91 98490 33201", "IN", CustomerSegment.ENTERPRISE, 72000.0, 20, 0.96),
    ("Meera Nambiar", "meera@ecosphere.in", "+91 94460 77192", "IN", CustomerSegment.PRO, 18000.0, 9, 0.89),
    ("Gaurav Kapoor", "gaurav@kapoormedia.tv", "+91 98111 66203", "IN", CustomerSegment.STARTER, 8500.0, 5, 0.84),
    ("Nisha Gupta", "nisha.gupta@agilework.in", "+91 98710 44810", "IN", CustomerSegment.PRO, 26000.0, 13, 0.93),
    ("Varun Chadha", "varun@chadhaadvisory.com", "+91 98102 99182", "IN", CustomerSegment.ENTERPRISE, 68000.0, 24, 0.98),
    ("Swati Hegde", "swati@bengalurulogic.io", "+91 98800 22391", "IN", CustomerSegment.PRO, 22500.0, 10, 0.91),
    ("Aditya Verma", "aditya@vermaenterprises.in", "+91 98290 88301", "IN", CustomerSegment.STARTER, 12500.0, 7, 0.86),
    ("Ritu Banerjee", "ritu.b@kolkatasoft.in", "+91 98300 55192", "IN", CustomerSegment.PRO, 29000.0, 15, 0.94),
    ("David Miller", "david.m@globalstream.us", "+1 415 882 1092", "US", CustomerSegment.ENTERPRISE, 92000.0, 30, 0.98),
    ("Sarah Jenkins", "sarah@nordicventures.co", "+44 20 7946 0912", "GB", CustomerSegment.PRO, 34000.0, 14, 0.92),
    ("Rajesh Kulkarni", "rajesh.k@punesystems.in", "+91 98221 33490", "IN", CustomerSegment.PRO, 25000.0, 11, 0.93),
    ("Ankit Agrawal", "ankit@jaipurfin.com", "+91 98291 44021", "IN", CustomerSegment.STARTER, 9000.0, 5, 0.87),
    ("Divya Menon", "divya@cochinanalytics.ai", "+91 94471 22849", "IN", CustomerSegment.PRO, 27500.0, 12, 0.92),
]

FAILURE_PATTERNS = [
    {
        "code": "insufficient_funds",
        "reason": "Payment failed due to insufficient funds in customer bank account.",
        "type": FailureType.SOFT_DECLINE,
        "is_retryable": True,
        "prob_base": 0.74,
        "action": RecoveryAction.RETRY,
        "explanation": "Customer has a high tenure and consistent salary deposits on the 1st of each month. Analysis indicates a temporary liquidity dip. Scheduled controlled retry for optimal bank settlement window."
    },
    {
        "code": "card_expired",
        "reason": "Customer card credential has passed its expiration date.",
        "type": FailureType.CREDENTIAL_ISSUE,
        "is_retryable": False,
        "prob_base": 0.15,
        "action": RecoveryAction.CUSTOMER_ACTION,
        "explanation": "The saved card has expired. Retrying against stale card credentials violates card network rules and will fail. Intelligent dunning initiated with one-click payment method update link."
    },
    {
        "code": "authentication_required",
        "reason": "Issuer requires customer 3D-Secure biometric or OTP authorization (RBI e-mandate limit step-up).",
        "type": FailureType.AUTH_REQUIRED,
        "is_retryable": False,
        "prob_base": 0.42,
        "action": RecoveryAction.CUSTOMER_ACTION,
        "explanation": "Transaction exceeds mandate threshold or issuer triggered mandatory 3DS verification. Automated multi-channel notification sent with authenticated authorization link."
    },
    {
        "code": "temporary_bank_down",
        "reason": "Issuer switch network timeout / core banking service unavailable.",
        "type": FailureType.NETWORK_TIMEOUT,
        "is_retryable": True,
        "prob_base": 0.88,
        "action": RecoveryAction.RETRY,
        "explanation": "Bank gateway reported transient 504 network timeout. Telemetry shows HDFC bank switch recovered. Immediate next-day retry recommended."
    },
    {
        "code": "velocity_limit_exceeded",
        "reason": "Customer exceeded daily bank debit frequency limit.",
        "type": FailureType.RISK_LIMIT,
        "is_retryable": True,
        "prob_base": 0.62,
        "action": RecoveryAction.WAIT_AND_RETRY,
        "explanation": "Card issuer velocity window active. Immediate retries will compound decline rate. Placing in 48-hour cooling off window before automated retry."
    },
    {
        "code": "stolen_lost_card",
        "reason": "Card reported lost or stolen by cardholder. Do not honor.",
        "type": FailureType.HARD_DECLINE,
        "is_retryable": False,
        "prob_base": 0.02,
        "action": RecoveryAction.DO_NOT_RETRY,
        "explanation": "Hard decline signal: Card flagged as lost/stolen. Strict safety rule enforced: Automated retries permanently halted to prevent merchant penalty and fraud escalation."
    },
    {
        "code": "mandate_revoked",
        "reason": "Customer cancelled standing recurring instruction with issuer.",
        "type": FailureType.HARD_DECLINE,
        "is_retryable": False,
        "prob_base": 0.08,
        "action": RecoveryAction.CUSTOMER_ACTION,
        "explanation": "Standing e-mandate revoked. Sent personalized subscription reactivation campaign with special renewal incentive."
    }
]

BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "JPMorgan Chase"]

def generate_demo_dataset() -> Dict[str, Any]:
    random.seed(42)
    now = datetime.now(timezone.utc)
    
    customers: List[Customer] = []
    payment_methods: List[PaymentMethod] = []
    payments: List[Payment] = []
    retry_attempts: List[RetryAttempt] = []
    dunning_events: List[DunningEvent] = []
    
    # 1. Create 100+ Customers (by expanding names list with variations)
    cust_id_counter = 1
    for i in range(105):
        base_name, base_email, base_phone, country, segment, ltv, tenure, success_rate = NAMES[i % len(NAMES)]
        suffix = f"_{i//len(NAMES) + 1}" if i >= len(NAMES) else ""
        c_id = f"cust_{cust_id_counter:04d}"
        
        customer = Customer(
            id=c_id,
            name=f"{base_name}{suffix}",
            email=base_email.replace("@", f"{suffix}@" if suffix else "@"),
            phone=base_phone,
            country=country,
            segment=segment,
            lifetime_value=round(ltv * random.uniform(0.85, 1.25), 2),
            tenure_months=max(1, tenure + random.randint(-2, 4)),
            historical_success_rate=round(min(0.99, max(0.65, success_rate + random.uniform(-0.05, 0.03))), 2)
        )
        customers.append(customer)
        
        # Payment Method
        pm_id = f"pm_{cust_id_counter:04d}"
        is_expired = (i % 7 == 0) # 1 in 7 cards expired
        exp_year = now.year - 1 if is_expired else now.year + random.randint(1, 4)
        pm = PaymentMethod(
            id=pm_id,
            type="card" if i % 4 != 0 else "upi_autopay",
            card_brand=random.choice(["Visa", "Mastercard", "RuPay", "Amex"]),
            last4=str(random.randint(1000, 9999)),
            exp_month=random.randint(1, 12),
            exp_year=exp_year,
            is_expired=is_expired
        )
        payment_methods.append(pm)
        cust_id_counter += 1

    # 2. Generate 320+ Payments (Historical recovered, ongoing failed, scheduled, in-review)
    payment_id_counter = 1001
    for i in range(320):
        cust = customers[i % len(customers)]
        pm = payment_methods[i % len(payment_methods)]
        
        # Generate varied realistic amounts
        if cust.segment == CustomerSegment.ENTERPRISE:
            amount = random.choice([25000.0, 45000.0, 60000.0, 85000.0])
        elif cust.segment == CustomerSegment.PRO:
            amount = random.choice([2000.0, 3500.0, 4999.0, 7500.0, 12000.0])
        else:
            amount = random.choice([999.0, 1499.0, 1999.0, 2499.0])
            
        currency = "INR" if cust.country == "IN" else "USD"
        if currency == "USD":
            amount = round(amount / 80.0, 2)
            
        # Determine failure pattern
        if pm.is_expired:
            pattern = FAILURE_PATTERNS[1] # card_expired
        else:
            weights = [0.45, 0.05, 0.18, 0.15, 0.10, 0.04, 0.03]
            pattern = random.choices(FAILURE_PATTERNS, weights=weights, k=1)[0]
            
        p_id = f"pay_rp_{payment_id_counter}"
        fail_id = f"fail_{payment_id_counter}"
        
        created_days_ago = random.randint(0, 45)
        created_time = now - timedelta(days=created_days_ago, hours=random.randint(1, 23), minutes=random.randint(0, 59))
        
        failure = PaymentFailure(
            id=fail_id,
            payment_id=p_id,
            error_code=pattern["code"],
            decline_reason=pattern["reason"],
            failure_type=pattern["type"],
            bank_name=random.choice(BANKS),
            is_retryable=pattern["is_retryable"],
            created_at=created_time.isoformat()
        )
        
        # Determine status distribution
        # 60% recovered (historical successful recoveries), 25% active failed/scheduled, 10% in review/dunning, 5% churned
        rand_status_val = random.random()
        if created_days_ago > 3:
            if pattern["type"] == FailureType.SOFT_DECLINE or pattern["type"] == FailureType.NETWORK_TIMEOUT:
                status = PaymentStatus.RECOVERED if rand_status_val < 0.72 else PaymentStatus.FAILED
            elif pattern["type"] == FailureType.CREDENTIAL_ISSUE or pattern["type"] == FailureType.AUTH_REQUIRED:
                status = PaymentStatus.RECOVERED if rand_status_val < 0.48 else PaymentStatus.CHURNED
            elif pattern["type"] == FailureType.HARD_DECLINE:
                status = PaymentStatus.CHURNED
            else:
                status = PaymentStatus.RECOVERED if rand_status_val < 0.55 else PaymentStatus.FAILED
        else:
            if amount > 15000 and rand_status_val < 0.4:
                status = PaymentStatus.IN_REVIEW
            elif pattern["action"] == RecoveryAction.RETRY or pattern["action"] == RecoveryAction.WAIT_AND_RETRY:
                status = PaymentStatus.SCHEDULED if rand_status_val < 0.6 else PaymentStatus.FAILED
            else:
                status = PaymentStatus.FAILED
                
        # Calculate AI Decision
        prob = round(min(0.96, max(0.04, pattern["prob_base"] + (cust.historical_success_rate - 0.9) * 0.5 + random.uniform(-0.06, 0.06))), 2)
        confidence = round(min(0.98, max(0.65, 0.82 + (0.1 if cust.tenure_months > 6 else -0.05) + random.uniform(-0.04, 0.05))), 2)
        requires_human = (amount >= 10000.0 and confidence < 0.75) or (status == PaymentStatus.IN_REVIEW)
        
        retry_time = (created_time + timedelta(days=1, hours=random.randint(9, 14))).isoformat() if pattern["action"] in [RecoveryAction.RETRY, RecoveryAction.WAIT_AND_RETRY] else None
        
        decision = AIDecision(
            id=f"dec_{payment_id_counter}",
            payment_id=p_id,
            classification=pattern["type"],
            recommended_action=RecoveryAction.HUMAN_REVIEW if requires_human else pattern["action"],
            recovery_probability=prob,
            confidence=confidence,
            recommended_retry_time=retry_time,
            explanation=pattern["explanation"],
            decision_factors=DecisionFactors(
                failure_type=pattern["type"].value,
                historical_success_rate=cust.historical_success_rate,
                previous_attempts_count=1 if status == PaymentStatus.RECOVERED else 0,
                customer_tenure_months=cust.tenure_months,
                amount_risk_tier="high" if amount >= 10000 else "medium" if amount >= 3000 else "low",
                bank_health_score=0.94 if failure.bank_name in ["HDFC Bank", "ICICI Bank"] else 0.82,
                optimal_time_slot="Tomorrow 09:30 AM",
                network_retry_safe=pattern["is_retryable"]
            ),
            requires_human_review=requires_human,
            human_approval_status="pending" if requires_human else "not_required",
            agent_version="v1.2-langgraph",
            created_at=created_time.isoformat()
        )
        
        # Build Workflow Steps
        workflow_steps = [
            WorkflowStep(node_name="Payment Failed", status="completed", timestamp=created_time.isoformat(), details={"error_code": pattern["code"], "bank": failure.bank_name}),
            WorkflowStep(node_name="LangGraph Analysis", status="completed", timestamp=(created_time + timedelta(seconds=2)).isoformat(), details={"classification": pattern["type"].value, "agent": "RecoveryAgent"}),
            WorkflowStep(node_name="Safety & Constraint Gate", status="completed", timestamp=(created_time + timedelta(seconds=3)).isoformat(), details={"is_retryable": pattern["is_retryable"], "retry_limit_ok": True}),
            WorkflowStep(node_name="Probabilistic Scoring", status="completed", timestamp=(created_time + timedelta(seconds=4)).isoformat(), details={"probability": prob, "confidence": confidence}),
            WorkflowStep(node_name="Action Determination", status="completed", timestamp=(created_time + timedelta(seconds=5)).isoformat(), details={"action": decision.recommended_action.value})
        ]
        
        if status == PaymentStatus.RECOVERED:
            workflow_steps.append(WorkflowStep(node_name="Retry Executed", status="completed", timestamp=(created_time + timedelta(hours=18)).isoformat(), details={"status": "captured", "amount": amount}))
            workflow_steps.append(WorkflowStep(node_name="Revenue Recovered", status="completed", timestamp=(created_time + timedelta(hours=18, seconds=1)).isoformat(), details={"recovered": True, "amount": amount}))
        elif status == PaymentStatus.SCHEDULED:
            workflow_steps.append(WorkflowStep(node_name="Retry Scheduled", status="in_progress", timestamp=(created_time + timedelta(seconds=6)).isoformat(), details={"scheduled_for": retry_time}))
        elif requires_human:
            workflow_steps.append(WorkflowStep(node_name="Human Review Gate", status="in_progress", timestamp=(created_time + timedelta(seconds=6)).isoformat(), details={"reason": "High-value transaction threshold"}))
            
        payment = Payment(
            id=p_id,
            business_id="biz_default_01",
            customer_id=cust.id,
            customer=cust,
            payment_method=pm,
            amount=amount,
            currency=currency,
            status=status,
            subscription_cycle="monthly",
            failure=failure,
            latest_decision=decision,
            retry_count=1 if status == PaymentStatus.RECOVERED else 0,
            max_retries=3,
            workflow_steps=workflow_steps,
            created_at=created_time.isoformat(),
            updated_at=(created_time + timedelta(hours=18 if status == PaymentStatus.RECOVERED else 0)).isoformat()
        )
        payments.append(payment)
        
        # Create Dunning Event if applicable
        if pattern["type"] in [FailureType.CREDENTIAL_ISSUE, FailureType.AUTH_REQUIRED, FailureType.HARD_DECLINE]:
            dunning = DunningEvent(
                id=f"dun_{payment_id_counter}",
                payment_id=p_id,
                customer_id=cust.id,
                customer_name=cust.name,
                customer_email=cust.email,
                stage=1,
                channel="email",
                subject="Action Required: Update your payment method to avoid subscription interruption",
                message_body=f"Hi {cust.name.split()[0]},\n\nYour recurring subscription payment of {currency} {amount:,.2f} could not be processed due to {pattern['reason'].lower()}\n\nPlease click the secure link below to update your payment details and keep your access uninterrupted.",
                action_link=f"https://recover.ai/pay/{p_id}?auth=rzp_{uuid.uuid4().hex[:8]}",
                status="sent" if created_days_ago > 1 else "scheduled",
                sent_at=(created_time + timedelta(minutes=15)).isoformat() if created_days_ago > 1 else None
            )
            dunning_events.append(dunning)
            
        payment_id_counter += 1
        
    return {
        "customers": customers,
        "payment_methods": payment_methods,
        "payments": payments,
        "dunning_events": dunning_events
    }
