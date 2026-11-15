// src/screens/AlertDetailScreen.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMissionStore } from '../stores/useMissionStore';
import { getAlertExplanation } from '../lib/selectors';
import { StatusPill } from '../components/StatusPill';
import {
  ChevronLeft,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';

export const AlertDetailScreen: React.FC = () => {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const { result, alertStatusOverrides, acknowledgeAlert, resolveAlert } = useMissionStore();

  const alert = result.alerts.find((a) => a.id === alertId);

  if (!alert) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-[#9AA6BF] space-y-4">
        <p className="text-sm">Alert not found.</p>
        <button
          onClick={() => navigate('/alerts')}
          className="px-4 py-2 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold"
        >
          Return to Alerts
        </button>
      </div>
    );
  }

  const currentStatus = alertStatusOverrides[alert.id] ?? alert.status;
  const explanation = getAlertExplanation(alert);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/alerts')}
          className="p-2 rounded-xl bg-[#121A2E] hover:bg-[#1A2540] border border-white/10 text-[#9AA6BF] hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs font-mono text-[#9AA6BF]">
            Alert ID: {alert.id} • Day {alert.day}
          </span>
          <h1 className="text-xl font-bold text-white">{alert.title}</h1>
        </div>
      </div>

      {/* Main explanation card */}
      <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <StatusPill severity={alert.severity} size="md" />
            <span className="font-mono text-xs text-[#2DD4BF] font-bold">
              Target: {alert.crewId}
            </span>
            <span className="text-xs text-[#9AA6BF]">• Domain: {alert.domain}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentStatus === 'open' ? (
              <>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90"
                >
                  Acknowledge Alert
                </button>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#121A2E] text-slate-200 border border-white/10 text-xs font-semibold"
                >
                  Resolve
                </button>
              </>
            ) : currentStatus === 'acknowledged' ? (
              <button
                onClick={() => resolveAlert(alert.id)}
                className="px-3 py-1.5 rounded-lg bg-[#22C55E] text-[#0B1020] text-xs font-bold"
              >
                Mark as Resolved
              </button>
            ) : (
              <span className="text-xs font-mono font-bold text-[#22C55E]">
                ✓ Resolved & Cleared
              </span>
            )}
          </div>
        </div>

        {/* Synthesized Finding */}
        <div className="p-4 rounded-xl bg-[#0B1020] border border-white/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF]">
            Plain-Language AI Synthesis
          </span>
          <p className="text-xs text-white leading-relaxed">{explanation.plainSentence}</p>
        </div>

        {/* Ranked Factor Bars */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Ranked Factor Contributors (SHAP Evidence Weights)
            </h3>
            <span className="text-xs font-mono text-[#2DD4BF]">
              Confidence: {explanation.confidencePct}% ({alert.confidence.toUpperCase()})
            </span>
          </div>

          <div className="space-y-3">
            {explanation.factors.map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0B1020] border border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-[#9AA6BF] font-mono">#{i + 1}</span>
                    {f.indicator}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      f.arrow === '↑' ? 'text-[#EF4444]' : 'text-[#3B82F6]'
                    }`}
                  >
                    {f.arrow} {Math.abs(f.deltaPct)}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#121A2E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2DD4BF]"
                    style={{
                      width: `${Math.min(100, Math.max(15, f.impactScore * 40))}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-[#9AA6BF]">
                  <span>Normalized z-score: {f.z > 0 ? `+${f.z}` : f.z}</span>
                  <span>Feature Weight: {(f.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Recommended Action Items
          </h3>
          <div className="space-y-2">
            {alert.actions.map((act) => (
              <div
                key={act.rank}
                className="p-3.5 rounded-xl bg-[#0B1020] border border-white/10 flex items-start gap-3 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {act.rank}
                </span>
                <div className="flex-1">
                  <span className="text-white">{act.text}</span>
                  {act.escalate && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                      <ShieldAlert className="w-3 h-3" /> Escalate to flight surgeon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Badge */}
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9AA6BF]">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>
            <strong>Works offline:</strong> Complete diagnostic causal graph computed deterministically on-board spacecraft flight computers.
          </span>
        </div>
      </div>
    </div>
  );
};
