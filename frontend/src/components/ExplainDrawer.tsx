// src/components/ExplainDrawer.tsx
import React from 'react';
import { X, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useMissionStore } from '../stores/useMissionStore';
import { getAlertExplanation } from '../lib/selectors';
import { StatusPill } from './StatusPill';

export const ExplainDrawer: React.FC = () => {
  const {
    selectedAlertId,
    setSelectedAlertId,
    result,
    alertStatusOverrides,
    acknowledgeAlert,
    resolveAlert,
  } = useMissionStore();

  if (!selectedAlertId) return null;

  const alert = result.alerts.find((a) => a.id === selectedAlertId);
  if (!alert) return null;

  const currentStatus = alertStatusOverrides[alert.id] ?? alert.status;
  const explanation = getAlertExplanation(alert);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setSelectedAlertId(null)}
      />

      {/* Slide-in Drawer */}
      <aside
        aria-label="AI Explanation Panel"
        className="relative z-10 w-full max-w-lg bg-[#0B1020] border-l border-white/10 text-[#E6EAF2] flex flex-col shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#0B1020]/95 backdrop-blur-md border-b border-white/10 p-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2DD4BF] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                AI Diagnostic Attribution
              </span>
              <StatusPill severity={alert.severity} size="sm" />
            </div>
            <h2 className="text-base font-bold text-white leading-snug">
              {alert.title}
            </h2>
            <div className="text-xs text-[#9AA6BF] font-mono">
              Alert ID: {alert.id} • Day {alert.day} • {alert.crewId}
            </div>
          </div>

          <button
            onClick={() => setSelectedAlertId(null)}
            aria-label="Close explanation drawer"
            className="p-1.5 rounded-lg text-[#9AA6BF] hover:text-white hover:bg-[#121A2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 flex-1">
          {/* Plain Language Synthesis */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-white/10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF]">
              Synthesized Clinical Finding
            </span>
            <p className="text-xs leading-relaxed text-[#E6EAF2]">
              {explanation.plainSentence}
            </p>
          </div>

          {/* Confidence Meter */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#9AA6BF]">Algorithm Confidence:</span>
              <span className="font-bold text-[#2DD4BF] text-sm">
                {explanation.confidencePct}% ({alert.confidence.toUpperCase()})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0B1020] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2DD4BF] transition-all duration-500"
                style={{ width: `${explanation.confidencePct}%` }}
              />
            </div>
          </div>

          {/* Ranked Feature Contributors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#E6EAF2]">
                Ranked Factor Contributors (|z| × weight)
              </h3>
              <span className="text-[10px] font-mono text-[#9AA6BF]">Evidence Delta</span>
            </div>

            <div className="space-y-2.5">
              {explanation.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#121A2E] border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-[#9AA6BF]">#{idx + 1}</span>
                      {factor.indicator}
                    </span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        factor.arrow === '↑' ? 'text-[#EF4444]' : 'text-[#3B82F6]'
                      }`}
                    >
                      {factor.arrow} {Math.abs(factor.deltaPct)}%
                    </span>
                  </div>

                  {/* Impact bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#0B1020] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2DD4BF]"
                      style={{
                        width: `${Math.min(100, Math.max(10, factor.impactScore * 40))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9AA6BF] pt-0.5">
                    <span>z-score: {factor.z > 0 ? `+${factor.z}` : factor.z}</span>
                    <span>Weight: {(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Likely Pathophysiological Cause */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-white/10 space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF]">
              Etiological Attribution
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {alert.likelyCause}
            </p>
          </div>

          {/* Recommended Countermeasures */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF]">
              Ranked Autonomous Action Items
            </h4>
            <ul className="space-y-2 text-xs text-slate-200">
              {alert.actions.map((act) => (
                <li key={act.rank} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {act.rank}
                  </span>
                  <div className="flex-1">
                    <span>{act.text}</span>
                    {act.escalate && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                        <ShieldAlert className="w-3 h-3" /> Escalate to Flight Surgeon
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Offline verification notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9AA6BF]">
            <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span>
              <strong>Works offline:</strong> Model weights and decision attribution run locally on-board. Zero ground network latency.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 bg-[#0B1020]/95 backdrop-blur-md border-t border-white/10 p-4 flex items-center justify-between gap-3">
          {currentStatus === 'open' ? (
            <>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)] flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Acknowledge Alert</span>
              </button>
              <button
                onClick={() => resolveAlert(alert.id)}
                className="px-4 py-2.5 rounded-xl bg-[#121A2E] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold"
              >
                Resolve
              </button>
            </>
          ) : currentStatus === 'acknowledged' ? (
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs font-mono text-[#F59E0B] font-bold">
                Status: Acknowledged
              </span>
              <button
                onClick={() => resolveAlert(alert.id)}
                className="px-4 py-2 rounded-xl bg-[#22C55E] text-[#0B1020] text-xs font-bold hover:bg-[#22C55E]/90"
              >
                Mark as Resolved
              </button>
            </div>
          ) : (
            <div className="flex-1 text-center py-1 text-xs font-mono text-[#22C55E] font-bold">
              ✓ Alert Resolved & Cleared
            </div>
          )}

          <button
            onClick={() => setSelectedAlertId(null)}
            className="px-3 py-2.5 rounded-xl bg-transparent text-[#9AA6BF] hover:text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
};
