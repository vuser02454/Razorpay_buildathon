import React, { useState, useEffect } from 'react';
import { Mail, X, Send, Loader2, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Edit3 } from 'lucide-react';
import { api } from '../../services/api';
import { Payment, EmailPreviewResponse } from '../../types';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onEmailSent?: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  payment,
  onEmailSent
}) => {
  const [emailType, setEmailType] = useState<string>('PAYMENT_UPDATE_REQUIRED');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && payment) {
      setRecipientEmail(payment.customer?.email || 'vvijwal01@gmail.com');
      loadPreview();
    } else {
      setSendSuccess(null);
      setError(null);
    }
  }, [isOpen, payment, emailType]);

  const loadPreview = async () => {
    if (!payment) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.previewEmail(payment.id, emailType);
      setPreview(res);
    } catch (e: any) {
      setError(e.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!payment) return;
    setSending(true);
    setError(null);
    const targetEmail = recipientEmail.trim() || payment.customer?.email || 'vvijwal01@gmail.com';
    try {
      const res = await api.sendEmail(
        payment.id,
        targetEmail,
        payment.customer?.name,
        emailType
      );
      if (res.success) {
        setSendSuccess(`✓ Recovery email sent to ${targetEmail} via Brevo SMTP`);
        if (onEmailSent) onEmailSent();
      } else {
        setError(res.message || 'Brevo SMTP email delivery failed');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to dispatch email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !payment) return null;

  return (
    <div id="email-preview-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-up">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white font-display">
                  Transactional Email Preview
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Brevo SMTP + Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer: <strong className="text-slate-800 dark:text-slate-200">{payment.customer?.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-email-modal-btn"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient & Template Config Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-mono text-slate-400 font-bold uppercase text-[10px] shrink-0">Recipient:</span>
            <input
              id="recipient-email-input"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full max-w-xs px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400 font-bold uppercase text-[10px] shrink-0">Template:</span>
            <select
              id="email-template-select"
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              disabled={loading || sending}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="PAYMENT_UPDATE_REQUIRED">Payment Update Required</option>
              <option value="PAYMENT_FAILED">Payment Failed Notice</option>
              <option value="RETRY_SCHEDULED">Automated Retry Scheduled</option>
              <option value="FINAL_RECOVERY_NOTICE">Final Recovery Notice</option>
            </select>
          </div>
        </div>

        {/* Modal Body / HTML Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100 dark:bg-slate-950/90">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Generating Gemini personalized copy...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Metadata Inset */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono text-[10px]">SUBJECT:</span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">AI Empathetic Tone</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">{preview.subject}</div>
              </div>

              {/* Rendered HTML Preview Frame */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
                <div dangerouslySetInnerHTML={{ __html: preview.html_content }} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {sendSuccess ? (
              <span id="send-email-success-message" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {sendSuccess}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-400">
                Delivery Provider: <strong>Brevo SMTP Relay (Port 587)</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              id="cancel-email-btn"
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSend}
              id="send-email-btn"
              disabled={loading || sending || !!sendSuccess}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sending ? 'Sending...' : sendSuccess ? 'Sent' : 'Send Recovery Email'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
