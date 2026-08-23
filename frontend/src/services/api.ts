import {
  DashboardKPIs, Payment, AIDecision, DunningEvent, ExperimentStats,
  ClosedLoopMetric, MerchantPolicy, RazorpayConnectionStatus,
  RazorpayVerificationResponse, RazorpayVerifyOTPResponse, RazorpayTestConnectionResponse,
  RecoveryCommunication, EmailPreviewResponse, EmailSendResponse,
  SHAPExplanationResponse, SHAPFeatureContribution
} from '../types';
import { authStore } from './authStore';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = authStore.getToken();
  const admin = authStore.getAdmin();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (admin?.id) {
    headers['X-Admin-Id'] = admin.id;
  }
  return headers;
}

export interface AssistantChatResponse {
  reply: string;
  tools_called: Array<{ tool: string; status: string; message: string }>;
  structured_analysis?: {
    failure_category: string;
    recovery_probability: number;
    recommended_action: string;
    recommended_retry_time?: string;
    confidence: number;
    reasoning_summary: string;
    customer_action_required: boolean;
    source: string;
  };
  kpis?: DashboardKPIs;
}

export const api = {
  async getSystemStatus(): Promise<Record<string, { name: string; role: string; status: string; model?: string; port?: number }>> {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async chatWithAssistant(
    message: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<AssistantChatResponse> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error('AI Assistant request failed');
    return res.json();
  },

  async previewEmail(paymentId: string, emailType: string = 'PAYMENT_UPDATE_REQUIRED'): Promise<EmailPreviewResponse> {
    const res = await fetch(`${API_BASE}/recovery/email/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ payment_id: paymentId, email_type: emailType }),
    });
    if (!res.ok) throw new Error('Failed to generate email preview');
    return res.json();
  },

  async sendEmail(
    paymentId: string,
    customerEmail?: string,
    customerName?: string,
    emailType: string = 'PAYMENT_UPDATE_REQUIRED'
  ): Promise<EmailSendResponse> {
    const res = await fetch(`${API_BASE}/recovery/email/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        payment_id: paymentId,
        customer_email: customerEmail,
        customer_name: customerName,
        email_type: emailType,
      }),
    });
    if (!res.ok) throw new Error('Failed to send recovery email');
    return res.json();
  },

  async sendTestEmail(toEmail: string = 'test@example.com'): Promise<{ success: boolean; provider: string; message: string; provider_message_id?: string }> {
    const res = await fetch(`${API_BASE}/email/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ to_email: toEmail }),
    });
    if (!res.ok) throw new Error('Failed to send test email');
    return res.json();
  },

  async getPublicPayment(paymentId: string): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    customer_name: string;
    customer_email: string;
    merchant_name: string;
    failure_reason: string;
    created_at: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/${paymentId}/public`);
    if (!res.ok) throw new Error('Payment record not found');
    return res.json();
  },

  async submitCustomerPaymentUpdate(
    paymentId: string,
    data: { method: string; card_brand?: string; last4?: string; upi_id?: string }
  ): Promise<{ success: boolean; message: string; payment: Payment }> {
    const res = await fetch(`${API_BASE}/payments/${paymentId}/customer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update payment');
    return res.json();
  },

  async getEmailHistory(paymentId?: string): Promise<RecoveryCommunication[]> {
    const query = paymentId ? `?payment_id=${paymentId}` : '';
    const res = await fetch(`${API_BASE}/recovery/email/history${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch communication history');
    return res.json();
  },

  async getRazorpayStatus(): Promise<RazorpayConnectionStatus> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      // Fallback to /razorpay/status
      const fb = await fetch(`${API_BASE}/razorpay/status`, { headers: getAuthHeaders() });
      if (!fb.ok) throw new Error('Failed to fetch Razorpay connection status');
      return fb.json();
    }
    return res.json();
  },

  async requestRazorpayVerification(email: string): Promise<RazorpayVerificationResponse> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/request-verification`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Unable to send verification code. Please try again.');
    }
    return res.json();
  },

  async verifyRazorpayOTP(email: string, otp: string): Promise<RazorpayVerifyOTPResponse> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/verify`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid or expired verification code.');
    }
    return res.json();
  },

  async authorizeRazorpay(
    email: string,
    accountId?: string,
    merchantName?: string
  ): Promise<{ success: boolean; message: string; connection: RazorpayConnectionStatus }> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/authorize`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, account_id: accountId, merchant_name: merchantName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Razorpay authorization was not completed. You can try again.');
    }
    return res.json();
  },

  async testRazorpayConnection(): Promise<RazorpayTestConnectionResponse> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/test-connection`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Connection test failed. Please try again.');
    }
    return res.json();
  },

  async connectRazorpay(): Promise<{ success: boolean; message: string; connection: RazorpayConnectionStatus }> {
    const res = await fetch(`${API_BASE}/integrations/razorpay/connect`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to connect Razorpay');
    return res.json();
  },

  async syncRazorpay(): Promise<{
    success: boolean;
    message: string;
    synced_count: number;
    payments: Payment[];
    kpis: DashboardKPIs;
    connection: RazorpayConnectionStatus;
  }> {
    const res = await fetch(`${API_BASE}/razorpay/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to sync Razorpay payments');
    return res.json();
  },

  async disconnectRazorpay(): Promise<RazorpayConnectionStatus> {
    const res = await fetch(`${API_BASE}/razorpay/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to disconnect Razorpay');
    return res.json();
  },

  async getRecoveryExplanation(paymentId: string): Promise<SHAPExplanationResponse> {
    const res = await fetch(`${API_BASE}/ai/explain-recovery`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to fetch SHAP explainability analysis');
    }
    return res.json();
  },

  async getKPIs(): Promise<DashboardKPIs> {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getPayments(params?: {
    filter_type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: Payment[]; limit: number; offset: number }> {
    const query = new URLSearchParams();
    if (params?.filter_type && params.filter_type !== 'all') query.append('filter_type', params.filter_type);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset !== undefined) query.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  },

  async getPaymentById(id: string): Promise<Payment> {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payment details');
    return res.json();
  },

  async analyzePayment(paymentId: string): Promise<{
    success: boolean;
    payment: Payment;
    decision: AIDecision;
    graph_state: any;
  }> {
    const res = await fetch(`${API_BASE}/recovery/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ payment_id: paymentId }),
    });
    if (!res.ok) throw new Error('AI analysis failed');
    return res.json();
  },

  async runRecoveryWorkflow(paymentId: string): Promise<{
    success: boolean;
    payment: Payment;
    decision: AIDecision;
    graph_state: any;
  }> {
    return this.analyzePayment(paymentId);
  },

  async executeRecovery(paymentId: string): Promise<{
    success: boolean;
    message: string;
    payment: Payment;
  }> {
    const res = await fetch(`${API_BASE}/recovery/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ payment_id: paymentId }),
    });
    if (!res.ok) throw new Error('Execution failed');
    return res.json();
  },

  async approveReview(paymentId: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`${API_BASE}/recovery/${paymentId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  async rejectReview(paymentId: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`${API_BASE}/recovery/${paymentId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Rejection failed');
    return res.json();
  },

  async getDunningEvents(): Promise<DunningEvent[]> {
    const res = await fetch(`${API_BASE}/dunning`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dunning events');
    return res.json();
  },

  async sendDunning(dunningId: string): Promise<{ success: boolean; dunning: DunningEvent }> {
    const res = await fetch(`${API_BASE}/dunning/${dunningId}/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to send dunning');
    return res.json();
  },

  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getExperiments(): Promise<ExperimentStats> {
    const res = await fetch(`${API_BASE}/experiments`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch experiment stats');
    return res.json();
  },

  async getLearning(): Promise<ClosedLoopMetric[]> {
    const res = await fetch(`${API_BASE}/learning`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch closed loop learning');
    return res.json();
  },

  async getSettings(): Promise<{ policy: MerchantPolicy; is_demo_mode: boolean; razorpay_key_id: string }> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(policy: MerchantPolicy): Promise<{ success: boolean; policy: MerchantPolicy }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(policy),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async simulateFailure(params: {
    customer_id?: string;
    amount?: number;
    currency?: string;
    failure_code?: string;
    bank_name?: string;
  }): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`${API_BASE}/demo/simulate-failure`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to simulate failure');
    return res.json();
  },

  async simulateRetry(paymentId: string, outcome: 'success' | 'failed'): Promise<{
    success: boolean;
    message: string;
    payment: Payment;
  }> {
    const res = await fetch(`${API_BASE}/demo/simulate-retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ payment_id: paymentId, outcome }),
    });
    if (!res.ok) throw new Error('Failed to simulate retry');
    return res.json();
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/demo/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  },
};
