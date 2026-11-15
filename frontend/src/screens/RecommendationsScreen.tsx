// src/screens/RecommendationsScreen.tsx
import React from 'react';
import { useMissionStore } from '../stores/useMissionStore';
import { StatusPill } from '../components/StatusPill';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const RecommendationsScreen: React.FC = () => {
  const {
    currentDay,
    result,
    alertStatusOverrides,
    acknowledgeAlert,
    resolveAlert,
    setSelectedAlertId,
    dataSource,
  } = useMissionStore();

  const alerts = result.alerts.filter((a) => a.day === currentDay && a.actions.length > 0);

  if (dataSource === 'backend') {
    return (
      <section className="glass-panel rounded-2xl p-6 space-y-2">
        <h1 className="text-xl font-bold text-white">Scenario Recommendations</h1>
        <p className="text-xs text-slate-400">
          Select a browser scenario to view its scripted recommendations.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2DD4BF]" />
            Ranked Autonomous Clinical Countermeasures
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Actionable protocol guidance per alert with ground flight surgeon escalation rules (Day {currentDay})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#22C55E]">
          <ShieldCheck className="w-4 h-4" />
          <span>Autonomous Medical Protocols: Active</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-[#9AA6BF] space-y-3 shadow-xl">
          <ShieldCheck className="w-12 h-12 mx-auto text-[#22C55E]" />
          <h2 className="text-base font-bold text-white">No Clinical Actions Required</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All crew biomarkers are operating within physiological resilience bounds on Mission Day {currentDay}.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {alerts.map((alt) => {
            const currentStatus = alertStatusOverrides[alt.id] ?? alt.status;

            return (
              <div
                key={alt.id}
                className="glass-panel rounded-2xl p-6 space-y-5 shadow-xl border border-white/10"
              >
                {/* Alert Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusPill severity={alt.severity} size="sm" />
                      <span className="font-mono text-xs text-[#2DD4BF] font-bold">
                        Target: {alt.crewId}
                      </span>
                      <span className="text-xs text-[#9AA6BF]">• Domain: {alt.domain}</span>
                    </div>
                    <h2 className="text-base font-bold text-white">{alt.title}</h2>
                    <p className="text-xs text-slate-300">{alt.likelyCause}</p>
                  </div>

                  {/* Actions / Triage */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => setSelectedAlertId(alt.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF] hover:bg-[#2DD4BF]/25 text-xs font-semibold"
                    >
                      Why this alert?
                    </button>

                    {currentStatus === 'open' ? (
                      <>
                        <button
                          onClick={() => acknowledgeAlert(alt.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 active:scale-95 transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)] flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                        <button
                          onClick={() => resolveAlert(alt.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#121A2E] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold"
                        >
                          Resolve
                        </button>
                      </>
                    ) : currentStatus === 'acknowledged' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#F59E0B]">
                          Acknowledged
                        </span>
                        <button
                          onClick={() => resolveAlert(alt.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#22C55E] text-[#0B1020] text-xs font-bold hover:bg-[#22C55E]/90"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 text-xs font-mono font-bold">
                        ✓ Resolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Ranked Actions List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF] font-mono">
                    Prioritized Countermeasure Protocol:
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alt.actions.map((act) => (
                      <div
                        key={act.rank}
                        className="p-3.5 rounded-xl bg-[#0B1020]/70 border border-white/10 flex items-start gap-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {act.rank}
                        </span>

                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-white leading-snug">{act.text}</p>
                          {act.escalate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 mt-1">
                              <ShieldAlert className="w-3 h-3" /> Escalate to flight surgeon
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
