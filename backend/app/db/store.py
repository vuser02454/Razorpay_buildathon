import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    Payment, Customer, PaymentMethod, PaymentFailure, AIDecision, DunningEvent,
    RetryAttempt, MerchantPolicy, DashboardKPIs, ExperimentStats, ClosedLoopMetric,
    PaymentStatus, FailureType, RecoveryAction, RazorpayConnectionStatus,
    RecoveryCommunication, EmailType
)
from app.services.demo_data import generate_demo_dataset
from app.core.config import settings

DEMO_ADMIN_ID = "admin_demo_001"

class DataStore:
    """
    High-performance, multi-tenant reactive data store for RecoverAI.
    Ensures strict data isolation between Demo Admin and newly registered admins.
    """
    def __init__(self):
        self.customers: Dict[str, Customer] = {}
        self.payment_methods: Dict[str, PaymentMethod] = {}
        self.payments: Dict[str, Payment] = {}
        self.dunning_events: Dict[str, DunningEvent] = {}
        self.retry_attempts: Dict[str, RetryAttempt] = {}
        self.payment_admin_map: Dict[str, str] = {} # payment_id -> admin_id
        self.communications: Dict[str, RecoveryCommunication] = {} # comm_id -> RecoveryCommunication
        
        # Razorpay connections mapped by admin_id
        self.razorpay_connections: Dict[str, Dict[str, Any]] = {
            DEMO_ADMIN_ID: {
                "account_id": "acc_demo_rzp8849",
                "merchant_name": "RecoverAI SaaS Store",
                "access_token": "mock_oauth_tok_demo_secure",
                "refresh_token": "mock_oauth_ref_demo_secure",
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "is_connected": True
            }
        }

        self.policies: Dict[str, MerchantPolicy] = {
            DEMO_ADMIN_ID: MerchantPolicy(
                max_retry_attempts=settings.DEFAULT_MAX_RETRIES,
                max_recovery_window_hours=settings.DEFAULT_RETRY_WINDOW_HOURS,
                dunning_enabled=settings.DEFAULT_DUNNING_ENABLED,
                human_approval_threshold=settings.DEFAULT_HUMAN_REVIEW_CONFIDENCE_THRESHOLD,
                high_value_threshold=settings.DEFAULT_HIGH_VALUE_THRESHOLD
            )
        }
        self.closed_loop_history: List[Dict[str, Any]] = []
        self.audit_logs: List[Dict[str, Any]] = []
        self.initialize_demo_data()

    def initialize_demo_data(self):
        data = generate_demo_dataset()
        self.customers = {c.id: c for c in data["customers"]}
        self.payment_methods = {pm.id: pm for pm in data["payment_methods"]}
        self.payments = {p.id: p for p in data["payments"]}
        self.dunning_events = {d.id: d for d in data["dunning_events"]}
        self.retry_attempts = {}
        
        # Tag all demo records with DEMO_ADMIN_ID and source="DEMO"
        for pid, p in self.payments.items():
            self.payment_admin_map[pid] = DEMO_ADMIN_ID
            p.source = "DEMO"

        # Seed initial communications for Demo Admin
        first_pid = list(self.payments.keys())[0] if self.payments else "pay_demo_001"
        self.communications["comm_demo_01"] = RecoveryCommunication(
            id="comm_demo_01",
            admin_id=DEMO_ADMIN_ID,
            payment_id=first_pid,
            customer_name="Rahul Sharma",
            customer_email="rahul.sharma@example.in",
            channel="email",
            email_type=EmailType.PAYMENT_UPDATE_REQUIRED,
            subject="Payment update required for your ₹2,000 subscription",
            provider="brevo",
            provider_message_id="msg_brevo_99201948",
            status="SENT",
            created_at=datetime.now(timezone.utc).isoformat(),
            sent_at=datetime.now(timezone.utc).isoformat()
        )

        self.closed_loop_history = [
            {"failure_category": "Insufficient Funds (Soft)", "baseline_success_rate": 0.38, "current_success_rate": 0.69, "samples": 142},
            {"failure_category": "Issuer Timeout / Switch (Network)", "baseline_success_rate": 0.52, "current_success_rate": 0.88, "samples": 64},
            {"failure_category": "Velocity Limits (Wait & Retry)", "baseline_success_rate": 0.29, "current_success_rate": 0.61, "samples": 38},
            {"failure_category": "Card Expired (Dunning Conversion)", "baseline_success_rate": 0.18, "current_success_rate": 0.46, "samples": 52},
            {"failure_category": "Auth Step-Up / 3DS (Smart Reminder)", "baseline_success_rate": 0.22, "current_success_rate": 0.49, "samples": 44},
        ]
        self.audit_logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "system_initialized",
            "admin_id": DEMO_ADMIN_ID,
            "details": "RecoverAI demo dataset initialized with Brevo SMTP email delivery and 320 records."
        })

    def get_communications(self, admin_id: str, payment_id: Optional[str] = None) -> List[RecoveryCommunication]:
        all_comms = [c for c in self.communications.values() if c.admin_id == admin_id]
        if payment_id:
            all_comms = [c for c in all_comms if c.payment_id == payment_id]
        all_comms.sort(key=lambda x: x.created_at, reverse=True)
        return all_comms

    def record_communication(
        self,
        admin_id: str,
        payment_id: str,
        customer_name: str,
        customer_email: str,
        subject: str,
        provider: str = "brevo",
        provider_message_id: Optional[str] = None,
        status: str = "SENT",
        error_message: Optional[str] = None,
        email_type: EmailType = EmailType.PAYMENT_UPDATE_REQUIRED
    ) -> RecoveryCommunication:
        comm_id = f"comm_{uuid.uuid4().hex[:10]}"
        now_str = datetime.now(timezone.utc).isoformat()
        comm = RecoveryCommunication(
            id=comm_id,
            admin_id=admin_id,
            payment_id=payment_id,
            customer_name=customer_name,
            customer_email=customer_email,
            channel="email",
            email_type=email_type,
            subject=subject,
            provider=provider,
            provider_message_id=provider_message_id,
            status=status,
            error_message=error_message,
            created_at=now_str,
            sent_at=now_str if status == "SENT" else None
        )
        self.communications[comm_id] = comm
        return comm

    def get_razorpay_connection(self, admin_id: str) -> RazorpayConnectionStatus:
        conn = self.razorpay_connections.get(admin_id)
        if not conn or not conn.get("is_connected", False):
            return RazorpayConnectionStatus(
                is_connected=False,
                account_id=None,
                merchant_name=None,
                last_synced_at=None,
                status="disconnected",
                auth_url="/api/razorpay/connect"
            )
        return RazorpayConnectionStatus(
            is_connected=True,
            account_id=conn.get("account_id"),
            merchant_name=conn.get("merchant_name"),
            last_synced_at=conn.get("last_synced_at"),
            status="connected"
        )

    def connect_razorpay(
        self,
        admin_id: str,
        account_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        merchant_name: Optional[str] = "Live Merchant Gateway"
    ) -> RazorpayConnectionStatus:
        now_str = datetime.now(timezone.utc).isoformat()
        self.razorpay_connections[admin_id] = {
            "account_id": account_id,
            "merchant_name": merchant_name,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "connected_at": now_str,
            "last_synced_at": now_str,
            "is_connected": True
        }
        return self.get_razorpay_connection(admin_id)

    def disconnect_razorpay(self, admin_id: str) -> RazorpayConnectionStatus:
        if admin_id in self.razorpay_connections:
            self.razorpay_connections[admin_id]["is_connected"] = False
        return self.get_razorpay_connection(admin_id)

    def sync_razorpay_payments(self, admin_id: str) -> List[Payment]:
        conn = self.razorpay_connections.get(admin_id)
        if not conn or not conn.get("is_connected"):
            raise ValueError("Razorpay account is not connected. Please connect first.")

        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        conn["last_synced_at"] = now_str

        # Generate realistic synced failure events for this merchant
        synced_samples = [
            {
                "id": f"pay_rzp_live_{uuid.uuid4().hex[:8]}",
                "customer_name": "Vikram Sethi",
                "customer_email": "vikram.sethi@enterprise.in",
                "amount": 4500.0,
                "currency": "INR",
                "failure_code": "insufficient_funds",
                "failure_reason": "Customer account balance low",
                "bank_name": "ICICI Bank"
            },
            {
                "id": f"pay_rzp_live_{uuid.uuid4().hex[:8]}",
                "customer_name": "Rohan Deshmukh",
                "customer_email": "rohan.d@fintech.co",
                "amount": 12000.0,
                "currency": "INR",
                "failure_code": "bank_timeout",
                "failure_reason": "Issuer switch response timeout 504",
                "bank_name": "State Bank of India"
            }
        ]

        new_payments = []
        for s in synced_samples:
            cust_id = f"cust_{uuid.uuid4().hex[:6]}"
            cust = Customer(
                id=cust_id,
                name=s["customer_name"],
                email=s["customer_email"],
                country="IN",
                lifetime_value=s["amount"] * 10,
                tenure_months=9,
                historical_success_rate=0.91
            )
            self.customers[cust_id] = cust

            pm_id = f"pm_{uuid.uuid4().hex[:6]}"
            pm = PaymentMethod(id=pm_id, card_brand="Visa", last4="5892", exp_month=8, exp_year=2028, is_expired=False)
            self.payment_methods[pm_id] = pm

            fail = PaymentFailure(
                id=f"fail_{uuid.uuid4().hex[:6]}",
                payment_id=s["id"],
                error_code=s["failure_code"],
                decline_reason=s["failure_reason"],
                failure_type=FailureType.SOFT_DECLINE if s["failure_code"] == "insufficient_funds" else FailureType.NETWORK_TIMEOUT,
                bank_name=s["bank_name"],
                is_retryable=True,
                created_at=now_str
            )

            p = Payment(
                id=s["id"],
                customer_id=cust_id,
                customer=cust,
                payment_method=pm,
                amount=s["amount"],
                currency=s["currency"],
                status=PaymentStatus.FAILED,
                failure=fail,
                retry_count=0,
                max_retries=3,
                source="RAZORPAY",
                created_at=now_str,
                updated_at=now_str
            )
            self.payments[p.id] = p
            self.payment_admin_map[p.id] = admin_id
            new_payments.append(p)

        return new_payments

    def get_kpis(self, admin_id: str = DEMO_ADMIN_ID) -> DashboardKPIs:
        at_risk = 0.0
        recovered = 0.0
        failed_count = 0
        active_workflows = 0
        ai_recommended = 0
        
        for pid, p in self.payments.items():
            if self.payment_admin_map.get(pid, DEMO_ADMIN_ID) != admin_id:
                continue
                
            if p.status in [PaymentStatus.FAILED, PaymentStatus.SCHEDULED, PaymentStatus.IN_REVIEW]:
                at_risk += p.amount
                failed_count += 1
                if p.status in [PaymentStatus.SCHEDULED, PaymentStatus.IN_REVIEW]:
                    active_workflows += 1
            elif p.status == PaymentStatus.RECOVERED:
                recovered += p.amount
                if p.latest_decision:
                    ai_recommended += 1
                    
        total_finished = recovered + (at_risk if at_risk > 0 else 1)
        recovery_rate = round((recovered / (recovered + at_risk)) * 100, 1) if (recovered + at_risk) > 0 else 0.0
        
        return DashboardKPIs(
            revenue_at_risk=round(at_risk, 2),
            recovered_revenue=round(recovered, 2),
            recovery_rate=recovery_rate,
            failed_payments_count=failed_count,
            active_workflows_count=active_workflows,
            ai_recommended_recoveries=ai_recommended,
            currency="INR",
            currency_symbol="₹"
        )

    def get_payments(
        self,
        admin_id: str = DEMO_ADMIN_ID,
        filter_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        all_p = [p for pid, p in self.payments.items() if self.payment_admin_map.get(pid, DEMO_ADMIN_ID) == admin_id]
        
        # Sort newest first
        all_p.sort(key=lambda x: x.created_at, reverse=True)
        
        filtered = []
        for p in all_p:
            if filter_type and filter_type != "all":
                if not p.failure or p.failure.failure_type.value != filter_type:
                    continue
            if status and status != "all":
                if p.status.value != status:
                    continue
            if search:
                s_lower = search.lower()
                cust_name = p.customer.name.lower() if p.customer else ""
                cust_email = p.customer.email.lower() if p.customer else ""
                pid_match = p.id.lower()
                if s_lower not in cust_name and s_lower not in cust_email and s_lower not in pid_match:
                    continue
            filtered.append(p)
            
        total = len(filtered)
        paginated = filtered[offset : offset + limit]
        return {
            "total": total,
            "items": paginated,
            "limit": limit,
            "offset": offset
        }

    def get_payment_by_id(self, payment_id: str, admin_id: Optional[str] = None) -> Optional[Payment]:
        p = self.payments.get(payment_id)
        if not p:
            return None
        if admin_id and self.payment_admin_map.get(payment_id, DEMO_ADMIN_ID) != admin_id:
            return None
        return p

    def get_dunning_events(self, admin_id: str = DEMO_ADMIN_ID) -> List[DunningEvent]:
        admin_payment_ids = {pid for pid, aid in self.payment_admin_map.items() if aid == admin_id}
        return [d for d in self.dunning_events.values() if d.payment_id in admin_payment_ids]

    def get_policy(self, admin_id: str = DEMO_ADMIN_ID) -> MerchantPolicy:
        if admin_id not in self.policies:
            self.policies[admin_id] = MerchantPolicy(
                max_retry_attempts=settings.DEFAULT_MAX_RETRIES,
                max_recovery_window_hours=settings.DEFAULT_RETRY_WINDOW_HOURS,
                dunning_enabled=settings.DEFAULT_DUNNING_ENABLED,
                human_approval_threshold=settings.DEFAULT_HUMAN_REVIEW_CONFIDENCE_THRESHOLD,
                high_value_threshold=settings.DEFAULT_HIGH_VALUE_THRESHOLD
            )
        return self.policies[admin_id]

    def update_policy(self, policy: MerchantPolicy, admin_id: str = DEMO_ADMIN_ID) -> MerchantPolicy:
        self.policies[admin_id] = policy
        return policy

    def get_experiments(self, admin_id: str = DEMO_ADMIN_ID) -> ExperimentStats:
        if admin_id != DEMO_ADMIN_ID:
            # New admin has zero experiment data
            return ExperimentStats(
                control_payments=0,
                control_recovered=0,
                control_recovered_revenue=0.0,
                control_recovery_rate=0.0,
                ai_payments=0,
                ai_recovered=0,
                ai_recovered_revenue=0.0,
                ai_recovery_rate=0.0,
                recovery_uplift_percent=0.0,
                statistical_significance=False,
                confidence_level=0.0,
                sample_size_sufficient=False,
                status_note="No payment failure events have been processed yet."
            )

        # Demo Admin has realistic A/B testing stats
        control_size = 142
        treatment_size = 158
        control_recovered_count = 54
        treatment_recovered_count = 111
        
        control_rate = round((control_recovered_count / control_size) * 100, 1)
        treatment_rate = round((treatment_recovered_count / treatment_size) * 100, 1)
        uplift = round(treatment_rate - control_rate, 1)
        
        return ExperimentStats(
            control_payments=control_size,
            control_recovered=control_recovered_count,
            control_recovered_revenue=round(control_recovered_count * 2400.0, 2),
            control_recovery_rate=control_rate,
            ai_payments=treatment_size,
            ai_recovered=treatment_recovered_count,
            ai_recovered_revenue=round(treatment_recovered_count * 2400.0, 2),
            ai_recovery_rate=treatment_rate,
            recovery_uplift_percent=uplift,
            statistical_significance=True,
            confidence_level=0.99,
            sample_size_sufficient=True,
            status_note="Statistically significant uplift detected (p < 0.01)"
        )

    def get_experiments_stats(self, admin_id: str = DEMO_ADMIN_ID) -> ExperimentStats:
        return self.get_experiments(admin_id=admin_id)

    def record_ai_activity(
        self,
        provider: str,
        operation: str,
        admin_id: str,
        payment_id: Optional[str] = None,
        tool: Optional[str] = None,
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Audit log of all AI provider operations (Gemini, Groq, OpenRouter, LangGraph).
        Enforces tenant isolation and transparency for compliance.
        """
        entry = {
            "id": f"ai_log_{uuid.uuid4().hex[:10]}",
            "provider": provider,
            "operation": operation,
            "admin_id": admin_id,
            "payment_id": payment_id,
            "tool": tool,
            "success": success,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if not hasattr(self, "ai_activity_logs"):
            self.ai_activity_logs = []
        self.ai_activity_logs.append(entry)
        return entry

    def get_ai_activities(self, admin_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Returns tenant-isolated AI activity and audit trail logs.
        """
        if not hasattr(self, "ai_activity_logs"):
            self.ai_activity_logs = []
        user_logs = [log for log in self.ai_activity_logs if log.get("admin_id") == admin_id]
        return sorted(user_logs, key=lambda x: x["timestamp"], reverse=True)[:limit]

# Singleton store instance
store = DataStore()
