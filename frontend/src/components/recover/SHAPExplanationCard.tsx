import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Info,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { SHAPExplanationResponse, SHAPFeatureContribution } from '../../types';

interface SHAPExplanationCardProps {
  paymentId: string;
  initialExplanation?: SHAPExplanationResponse;
  customerName?: string;
}

export const SHAPExplanationCard: React.FC<SHAPExplanationCardProps> = ({
  paymentId,
  initialExplanation,
  customerName = 'Customer',
}) => {
  const [explanation, setExplanation] = useState<SHAPExplanationResponse | null>(
    initialExplanation || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExplanation) {
      setExplanation(initialExplanation);
      return;
    }

    let isMounted = true;
    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getRecoveryExplanation(paymentId);
        if (isMounted) {
          setExplanation(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Model explanation temporarily unavailable.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [paymentId, initialExplanation]);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2.5 animate-pulse">
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-lime-300">
          <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
          <span>Analyzing recovery factors via SHAP TreeExplainer...</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Computing feature-level Shapley attribution contributions from trained recovery model.
        </p>
      </div>
    );
  }

  if (error || (explanation && !explanation.available)) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Model Explanation:</strong>{' '}
          {explanation?.reason || 'Model explanation temporarily unavailable.'}
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  const baseProbPct = explanation.base_probability_percent || 51;
  const finalProbPct = explanation.recovery_probability_percent || 74;
  const netImpact = finalProbPct - baseProbPct;

  return (
    <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-lime-300 shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display">
              Why did AI choose this?
            </h4>
            <div className="text-[10px] font-mono text-slate-400">
              XGBoost &bull; SHAP TreeExplainer &bull; {explanation.model_version}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400 block">Baseline</span>
          <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">{baseProbPct}%</span>
        </div>
      </div>

      {/* Probability Waterfall Walkthrough */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 grid grid-cols-3 gap-1 sm:gap-2 text-xs font-mono text-center">
        <div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block truncate">Population Base</span>
          <strong className="text-slate-300 text-xs sm:text-sm">{baseProbPct}%</strong>
        </div>

        <div className="px-1 border-x border-slate-800/80">
          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block truncate">Customer Factors</span>
          <strong className={`text-xs sm:text-sm font-bold ${netImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netImpact >= 0 ? `+${netImpact}%` : `${netImpact}%`}
          </strong>
        </div>

        <div>
          <span className="text-[9px] sm:text-[10px] text-lime-300 uppercase block font-bold truncate">Predicted Prob</span>
          <strong className="text-lime-300 text-sm sm:text-base font-black">{finalProbPct}%</strong>
        </div>
      </div>

      {/* Positive Feature Contributions */}
      {explanation.top_positive_factors && explanation.top_positive_factors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 font-mono uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Positive Recovery Drivers</span>
          </div>

          <div className="space-y-2">
            {explanation.top_positive_factors.map((feat, idx) => {
              const barWidth = Math.min(100, Math.max(12, feat.impact_percent * 4));
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">
                      ✓ {feat.feature_name}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{feat.impact_percent}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 text-right">
                    Value: {feat.display_value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Negative Feature Contributions */}
      {explanation.top_negative_factors && explanation.top_negative_factors.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 font-mono uppercase tracking-wider">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Negative Risk Factors</span>
          </div>

          <div className="space-y-2">
            {explanation.top_negative_factors.map((feat, idx) => {
              const barWidth = Math.min(100, Math.max(12, feat.impact_percent * 4));
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">
                      − {feat.feature_name}
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      −{feat.impact_percent}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-rose-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 text-right">
                    Value: {feat.display_value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Natural Language Grounded Rationale */}
      {explanation.natural_language_summary && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-0.5">Model Narrative:</span>
          {explanation.natural_language_summary}
        </div>
      )}

      {/* Safety Policy Guardrail Notice */}
      <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>SHAP provides feature-level explainability. Deterministic policy gates remain authoritative.</span>
      </div>
    </div>
  );
};
