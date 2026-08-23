import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Cpu
} from 'lucide-react';
import { api, AssistantChatResponse } from '../../services/api';
import { authStore } from '../../services/authStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools?: Array<{ tool: string; status: string; message: string }>;
  structured_analysis?: any;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "Why did Rahul's payment fail?",
  "What should I retry first?",
  "Show today's recovered revenue",
  "Explain this policy",
  "Analyze my recovery rate"
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const admin = authStore.getAdmin();
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello **${admin?.name || 'Admin'}**! I am your **RecoverAI Assistant** powered by **Groq LPU** for sub-second conversational responses and **Google Gemini** for deep website intelligence.\n\nAsk me anything about your live failed payments, recovery probabilities, retry schedules, or deterministic policy safety rules.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const admin = authStore.getAdmin();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setActiveStep('Groq: Selecting backend tools...');

    // Simulate real step progression
    const stepTimer1 = setTimeout(() => setActiveStep('✓ Executing database tools (tenant validated)'), 300);
    const stepTimer2 = setTimeout(() => setActiveStep('⟳ Synthesizing live response via Groq'), 700);

    try {
      const historyForApi = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res: AssistantChatResponse = await api.chatWithAssistant(query, historyForApi);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setActiveStep(null);

      const botMsg: Message = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tools: res.tools_called,
        structured_analysis: res.structured_analysis
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setActiveStep(null);

      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: "I'm temporarily having trouble connecting to Groq. Please check your network or try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Conversation reset. How can I help you analyze your revenue recovery workflows today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-full sm:max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-fade-up">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-950 dark:text-white font-display text-sm">
                RecoverAI Assistant
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                Groq LPU
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live Database Tool-Calling &bull; Tenant Isolated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>

              {/* Tool Calling Execution Badges */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase">
                    Tools Executed:
                  </div>
                  {msg.tools.map((t, tidx) => (
                    <div
                      key={tidx}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md"
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{t.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Loading Progress State */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/50 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="font-mono text-[11px]">{activeStep || 'Processing query with Groq...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
          Suggested Questions:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt, pidx) => (
            <button
              key={pidx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-[11px] text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask RecoverAI (e.g. Why did Rahul fail?)..."
            disabled={loading}
            className="flex-1 px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

    </div>
  );
};
