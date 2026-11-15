import React from 'react';
import {
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Stethoscope,
  Microscope,
  Info,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const AlertDrawer: React.FC = () => {
  const {
    isAlertDrawerOpen,
    closeAlertDrawer,
    activeAlert,
    acknowledgeCurrentAlert,
    currentDay,
  } = useSimulationStore();

  if (!isAlertDrawerOpen || !activeAlert) return null;

  const severityColor =
    activeAlert.severity === 'critical'
      ? {
          badge: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50',
          border: 'border-[#EF4444]/50',
          glow: 'shadow-[0_0_24px_rgba(239,68,68,0.25)]',
        }
      : activeAlert.severity === 'elevated'
      ? {
          badge: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50',
          border: 'border-[#F59E0B]/50',
          glow: 'shadow-[0_0_24px_rgba(245,158,11,0.2)]',
        }
      : {
          badge: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/50',
          border: 'border-[#3B82F6]/50',
          glow: 'shadow-[0_0_24px_rgba(59,130,246,0.2)]',
        };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeAlertDrawer}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        aria-label="Explained Alert Drawer"
        className={`relative z-10 w-full max-w-xl bg-[#0B1020] border-l border-[#1F2D4C] text-slate-200 flex flex-col shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300 ${severityColor.glow}`}
      >
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 bg-[#0B1020]/95 backdrop-blur-md border-b border-[#1F2D4C] p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border ${severityColor.badge} flex items-center justify-center`}
            >
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${severityColor.badge}`}
                >
                  {activeAlert.severity} Risk
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Day {activeAlert.day} ({activeAlert.date})
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1 leading-snug">
                {activeAlert.title}
              </h2>
            </div>
          </div>

          <button
            onClick={closeAlertDrawer}
            aria-label="Close alert drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#121A2E] border border-transparent hover:border-[#1F2D4C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 flex-1">
          {/* Domain & Summary Card */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Domain Vector</span>
              <span className="font-bold text-[#2DD4BF]">{activeAlert.domainName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Domain Risk Score</span>
              <span className="font-mono font-bold text-white text-base">
                {activeAlert.riskScore}/100
              </span>
            </div>
            <p className="text-xs text-slate-300 pt-2 border-t border-[#1F2D4C]">
              {activeAlert.summary}
            </p>
          </div>

          {/* Section: Evidence Contributors (SHAP / Feature Attribution) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Microscope className="w-4 h-4 text-[#2DD4BF]" />
                <span>Feature Attribution (SHAP Contributors)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">% Contribution to Risk</span>
            </div>

            <div className="space-y-2.5">
              {activeAlert.contributors.map((contrib) => (
                <div
                  key={contrib.id}
                  className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] hover:border-[#2DD4BF]/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{contrib.biomarkerName}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0B1020] text-slate-400 border border-[#1F2D4C]">
                        {contrib.biomarkerKey}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-bold text-xs">
                      {contrib.direction === 'elevating' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-[#EF4444]" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-[#22C55E]" />
                      )}
                      <span
                        className={
                          contrib.direction === 'elevating' ? 'text-[#EF4444]' : 'text-[#22C55E]'
                        }
                      >
                        +{contrib.contributionPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar of Contribution */}
                  <div className="w-full h-1.5 rounded-full bg-[#0B1020] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        contrib.direction === 'elevating' ? 'bg-[#EF4444]' : 'bg-[#22C55E]'
                      }`}
                      style={{ width: `${contrib.contributionPercent}%` }}
                    />
                  </div>

                  {/* Values comparison: Observed vs Baseline */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <div>
                      <span>Observed: </span>
                      <strong className="text-white">{contrib.observedValue}</strong>
                    </div>
                    <div>
                      <span>30D Baseline: </span>
                      <span className="text-slate-300">{contrib.baselineValue}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {contrib.clinicalSignificance}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Pathophysiological Mechanism */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-[#2DD4BF]" />
              <span>Physiological Mechanism</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeAlert.physiologicalMechanism}
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-[#1F2D4C]/70">
              <strong className="text-slate-300">Clinical Prognosis: </strong>
              {activeAlert.clinicalRationale}
            </div>
          </div>

          {/* Section: Actionable Clinical Protocols */}
          <div className="p-4 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#2DD4BF]" />
              <span>Recommended Interventions</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {activeAlert.recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 bg-[#0B1020]/95 backdrop-blur-md border-t border-[#1F2D4C] p-4 flex items-center justify-between gap-3">
          {activeAlert.acknowledged ? (
            <div className="flex items-center gap-2 text-xs text-[#22C55E] font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Triaged & Logged to Dexie {activeAlert.triagedAt ? `at ${activeAlert.triagedAt}` : ''}
              </span>
            </div>
          ) : (
            <button
              onClick={acknowledgeCurrentAlert}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acknowledge & Mark Triaged</span>
            </button>
          )}

          <button
            onClick={closeAlertDrawer}
            className="px-4 py-2.5 rounded-xl bg-[#121A2E] text-slate-300 hover:text-white border border-[#1F2D4C] text-xs font-semibold transition-colors"
          >
            Dismiss
          </button>
        </div>
      </aside>
    </div>
  );
};
