import re
from typing import Dict, Any, List, Optional
from app.db.store import store, DEMO_ADMIN_ID
from app.services.grok_service import GrokService
from app.services.gemini_service import GeminiService
from app.services.email_service import EmailService
from app.models.schemas import PaymentStatus, RecoveryAction, EmailType

class AssistantRouter:
    """
    Intelligent Intent Router and Tool Orchestrator for the RecoverAI Assistant.
    Connects Grok (conversation) with Gemini (platform intelligence), real database records, and transactional email dispatch.
    """

    @classmethod
    async def process_chat(
        cls,
        user_message: str,
        chat_history: List[Dict[str, str]],
        admin_id: str = DEMO_ADMIN_ID,
        admin_name: str = "Admin",
        is_demo: bool = True
    ) -> Dict[str, Any]:
        msg_lower = user_message.lower()
        tools_called: List[Dict[str, Any]] = []
        context_snippets: List[str] = []

        # 1. Fetch Admin KPIs
        kpis = store.get_kpis(admin_id=admin_id)
        kpis_data = kpis.model_dump() if hasattr(kpis, "model_dump") else kpis.dict()
        context_snippets.append(
            f"Admin Workspace: {admin_name} (ID: {admin_id}, is_demo: {is_demo})\n"
            f"KPIs -> Recovered Revenue: ₹{kpis.recovered_revenue:,.2f}, Recovery Rate: {kpis.recovery_rate}%, "
            f"Pending Revenue at Risk: ₹{kpis.revenue_at_risk:,.2f}, Failed Payments: {kpis.failed_payments_count}"
        )

        # 2. Fetch Payment Queue
        payments_data = store.get_payments(admin_id=admin_id, limit=10)
        payments = payments_data["items"]
        tools_called.append({
            "tool": "get_recovery_queue",
            "status": "success",
            "message": f"Retrieved {len(payments)} live transactions for tenant"
        })

        # Match specific customer/payment if referenced
        target_payment = None
        for p in payments:
            c_name = (p.customer.name if p.customer else "").lower()
            pid = p.id.lower()
            if any(name_part in msg_lower for name_part in c_name.split()) or pid in msg_lower:
                target_payment = p
                break

        # If user refers to "rahul" and target_payment is found or we are in demo mode
        if not target_payment and "rahul" in msg_lower and len(payments) > 0:
            target_payment = payments[0]

        structured_analysis = None
        if target_payment:
            tools_called.append({
                "tool": "get_payment_details",
                "status": "success",
                "message": f"Loaded payment {target_payment.id} for customer {target_payment.customer.name if target_payment.customer else 'Customer'}"
            })
            
            # Run Gemini failure analysis
            ctx = {
                "amount": target_payment.amount,
                "currency": target_payment.currency,
                "failure_code": target_payment.failure.error_code if target_payment.failure else "insufficient_funds",
                "failure_reason": target_payment.failure.decline_reason if target_payment.failure else "Declined",
                "customer_history": {
                    "tenure_months": target_payment.customer.tenure_months if target_payment.customer else 12,
                    "historical_success_rate": target_payment.customer.historical_success_rate if target_payment.customer else 0.95
                },
                "retry_count": target_payment.retry_count,
                "is_card_expired": target_payment.payment_method.is_expired if target_payment.payment_method else False,
                "customer_name": target_payment.customer.name if target_payment.customer else "Customer"
            }
            analysis = await GeminiService.analyze_payment_failure(ctx)
            structured_analysis = analysis.model_dump() if hasattr(analysis, "model_dump") else analysis.dict()
            tools_called.append({
                "tool": "gemini_failure_analysis",
                "status": "success",
                "message": f"Gemini calculated {analysis.recovery_probability}% recovery probability ({analysis.recommended_action})"
            })

            context_snippets.append(
                f"Target Payment: ID={target_payment.id}, Amount=₹{target_payment.amount}, "
                f"Customer={target_payment.customer.name if target_payment.customer else 'Unknown'}, "
                f"CustomerEmail={target_payment.customer.email if target_payment.customer else 'None'}, "
                f"Failure={target_payment.failure.error_code if target_payment.failure else 'declined'}, "
                f"Gemini Analysis={structured_analysis}"
            )

        # 3. Policy Gate Tool
        if "policy" in msg_lower or "gate" in msg_lower or "safety" in msg_lower:
            policy = store.get_policy(admin_id=admin_id)
            policy_data = policy.model_dump() if hasattr(policy, "model_dump") else policy.dict()
            tools_called.append({
                "tool": "get_recovery_policy",
                "status": "success",
                "message": f"Max retries: {policy.max_retry_attempts}, Window: {policy.max_recovery_window_hours}h, High-value threshold: ₹{policy.high_value_threshold}"
            })
            context_snippets.append(f"Policy: {policy_data}")

        # 4. A/B Testing Tool
        if "experiment" in msg_lower or "a/b" in msg_lower or "uplift" in msg_lower:
            exp = store.get_experiments(admin_id=admin_id)
            exp_data = exp.model_dump() if hasattr(exp, "model_dump") else exp.dict()
            tools_called.append({
                "tool": "get_ab_testing_results",
                "status": "success",
                "message": f"Uplift: +{exp.recovery_uplift_percent}%, Control: {exp.control_recovery_rate}%, RecoverAI: {exp.ai_recovery_rate}%"
            })
            context_snippets.append(f"Experiments: {exp_data}")

        # 5. Transactional Email Dispatch Tool
        if any(w in msg_lower for w in ["email", "mail", "send", "dunning", "notify", "receipt"]):
            # Extract email if mentioned in user prompt
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_message)
            to_email = email_match.group(0) if email_match else None

            if not to_email and target_payment and target_payment.customer and target_payment.customer.email:
                to_email = target_payment.customer.email

            if not to_email:
                admin_obj = store.get_admin_by_id(admin_id)
                if admin_obj and admin_obj.email:
                    to_email = admin_obj.email

            if to_email and any(action in msg_lower for action in ["send", "dispatch", "shoot", "trigger", "deliver", "notify", "mail"]):
                cust_name = target_payment.customer.name if (target_payment and target_payment.customer) else "Valued Customer"
                amt = target_payment.amount if target_payment else 2500.0
                pid = target_payment.id if target_payment else "pay_live_01"

                if "stolen" in msg_lower or "lost" in msg_lower:
                    send_res = EmailService.send_payment_update_email(
                        to_email=to_email,
                        customer_name=cust_name,
                        amount=amt,
                        payment_id=pid,
                        failure_reason="Card reported lost or stolen. Action required to update payment method.",
                        headline="Important: Security Alert & Payment Method Update",
                        body=f"Your card on file for your ₹{amt:,.2f} subscription was reported compromised. Please update your payment method to protect your account.",
                        subject="Important: Security Notice & Action Required"
                    )
                elif "retry" in msg_lower:
                    send_res = EmailService.send_retry_notification(
                        to_email=to_email,
                        customer_name=cust_name,
                        amount=amt,
                        payment_id=pid
                    )
                elif "success" in msg_lower or "recovered" in msg_lower:
                    send_res = EmailService.send_recovery_success_email(
                        to_email=to_email,
                        customer_name=cust_name,
                        amount=amt,
                        payment_id=pid
                    )
                else:
                    send_res = EmailService.send_payment_update_email(
                        to_email=to_email,
                        customer_name=cust_name,
                        amount=amt,
                        payment_id=pid
                    )

                if send_res.get("success"):
                    tools_called.append({
                        "tool": "send_transactional_email",
                        "status": "success",
                        "message": f"Dispatched {send_res.get('email_type', 'transactional')} email to {to_email} via {send_res.get('provider', 'Gmail SMTP')} (Message ID: {send_res.get('message_id')})"
                    })
                    context_snippets.append(
                        f"EMAIL ACTION EXECUTED: Successfully sent transactional email to {to_email} via {send_res.get('provider')}. Message ID: {send_res.get('message_id')}."
                    )
                else:
                    tools_called.append({
                        "tool": "send_transactional_email",
                        "status": "failed",
                        "message": f"Email delivery failed for {to_email}: {send_res.get('error')}"
                    })
                    context_snippets.append(
                        f"EMAIL ACTION FAILED: Attempted to send email to {to_email}, but delivery failed: {send_res.get('diagnostic_error') or send_res.get('error')}."
                    )

        # Build final Grok conversational response
        full_context = "\n---\n".join(context_snippets)
        messages_for_grok = chat_history + [{"role": "user", "content": user_message}]
        
        reply_text = await GrokService.chat(messages_for_grok, system_context=full_context)

        return {
            "reply": reply_text,
            "tools_called": tools_called,
            "structured_analysis": structured_analysis,
            "kpis": kpis_data
        }
