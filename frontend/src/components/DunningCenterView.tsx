import React, { useEffect, useState } from 'react';
import { Mail, Send, Eye, Loader2, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { DunningEvent } from '../types';

export const DunningCenterView: React.FC = () => {
  const [events, setEvents] = useState<DunningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<DunningEvent | null>(null);

  useEffect(() => {
    api.getDunningEvents().then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSend = async (id: string) => {
    try {
      const res = await api.sendDunning(id);
      if (res.success) {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'sent', sent_at: new Date().toISOString() } : e)));
      }
    } catch (e) { console.error(e); }
  };

  const STATUS_BADGE: Record<string, string> = {
    scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    sent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    opened: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    clicked: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    converted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Dunning Center</h2>
        <p className="text-xs text-slate-400">{events.length} failure-specific communications • AI-personalized messaging</p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-semibold">Customer</th>
              <th className="text-left px-4 py-3 font-semibold">Subject</th>
              <th className="text-center px-4 py-3 font-semibold">Channel</th>
              <th className="text-center px-4 py-3 font-semibold">Stage</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-center px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{ev.customer_name}</div>
                  <div className="text-[10px] text-slate-500">{ev.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-slate-300 max-w-[220px] truncate">{ev.subject || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300">
                    {ev.channel === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    {ev.channel}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-300">{ev.stage}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[ev.status] || 'bg-slate-800 text-slate-400'}`}>
                    {ev.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => setPreview(ev)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="Preview">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {ev.status === 'scheduled' && (
                      <button onClick={() => handleSend(ev.id)} className="p-1.5 rounded-lg hover:bg-indigo-600 text-indigo-400 hover:text-white transition cursor-pointer" title="Send Now">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Dunning Message Preview</h3>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold">To: {preview.customer_email}</div>
              <div className="text-xs font-bold text-white">{preview.subject}</div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border-t border-slate-800 pt-2 mt-2">{preview.message_body}</div>
            </div>
            <div className="flex gap-2">
              {preview.status === 'scheduled' && (
                <button onClick={() => { handleSend(preview.id); setPreview(null); }} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send Now
                </button>
              )}
              <button onClick={() => setPreview(null)} className="flex-1 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
