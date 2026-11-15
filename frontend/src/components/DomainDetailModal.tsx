import React from 'react';
import {
  X,
  Heart,
  Zap,
  Moon,
  Wind,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import type { PhysiologicalDomainKey } from '../types';

export const DomainDetailModal: React.FC = () => {
  const {
    isDomainModalOpen,
    closeDomainModal,
    inspectingDomain,
    currentDay,
    simulationData,
  } = useSimulationStore();

  if (!isDomainModalOpen || !inspectingDomain) return null;

  const dayData = simulationData[currentDay - 1];
  const domain = dayData?.domainScores[inspectingDomain];
  if (!domain) return null;

  const domainIcons: Record<PhysiologicalDomainKey, React.ReactNode> = {
    cardiovascular: <Heart className="w-6 h-6 text-[#EF4444]" />,
    metabolic: <Zap className="w-6 h-6 text-[#F59E0B]" />,
    neurocognitive: <Moon className="w-6 h-6 text-[#8B5CF6]" />,
    respiratory: <Wind className="w-6 h-6 text-[#3B82F6]" />,
    immune: <ShieldAlert className="w-6 h-6 text-[#EC4899]" />,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        onClick={closeDomainModal}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-modal-title"
        className="relative z-10 w-full max-w-2xl bg-[#0B1020] border border-[#1F2D4C] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-[#1F2D4C] bg-[#121A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#1F2D4C]">
              {domainIcons[inspectingDomain]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="domain-modal-title" className="text-base font-bold text-white">
                  {domain.name}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0B1020] text-[#2DD4BF] border border-[#1F2D4C]">
                  Day {currentDay}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed constituent telemetry, z-scores, and autonomic feedback loops
              </p>
            </div>
          </div>

          <button
            onClick={closeDomainModal}
            aria-label="Close domain modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2540] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] text-center">
              <span className="text-slate-400 text-xs block">Risk Index (0-100)</span>
              <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                {domain.score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF]">
                {domain.category} Status
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] text-center">
              <span className="text-slate-400 text-xs block">7-Day Trajectory</span>
              <span
                className={`text-2xl font-black font-mono mt-0.5 block flex items-center justify-center gap-1 ${
                  domain.delta7d > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                }`}
              >
                {domain.delta7d > 0 ? `+${domain.delta7d}` : domain.delta7d}
              </span>
              <span className="text-[10px] text-slate-400">vs 7D baseline</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] text-center">
              <span className="text-slate-400 text-xs block">Sensor Confidence</span>
              <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                {(domain.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400">Signal integrity</span>
            </div>
          </div>

          {/* Primary Contributor Callout */}
          <div className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Primary Dynamic Driver:</span>
            <span className="font-bold text-[#2DD4BF] font-mono">{domain.primaryContributor}</span>
          </div>

          {/* Constituent Biomarkers List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Constituent Sensor Biomarkers
            </h3>

            <div className="space-y-2.5">
              {domain.biomarkers.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{b.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Normal Range: {b.referenceRange[0]} - {b.referenceRange[1]} {b.unit}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-sm text-white block">
                        {b.value.toFixed(1)} {b.unit}
                      </span>
                      <span
                        className={`text-[10px] ${
                          b.status === 'critical'
                            ? 'text-[#EF4444] font-bold'
                            : b.status !== 'normal'
                            ? 'text-[#F59E0B]'
                            : 'text-[#22C55E]'
                        }`}
                      >
                        {b.status.toUpperCase()} (z: {b.zScore > 0 ? `+${b.zScore.toFixed(1)}` : b.zScore.toFixed(1)})
                      </span>
                    </div>
                  </div>

                  {/* Range visual gauge bar */}
                  <div className="relative w-full h-2 rounded-full bg-[#0B1020] overflow-hidden border border-[#1F2D4C]">
                    <div
                      className="absolute top-0 bottom-0 bg-[#22C55E]/30 rounded-full"
                      style={{ left: '25%', width: '50%' }}
                    />
                    <div
                      className={`h-full w-2 rounded-full transition-all ${
                        b.status === 'critical'
                          ? 'bg-[#EF4444]'
                          : b.status !== 'normal'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#2DD4BF]'
                      }`}
                      style={{
                        marginLeft: `${Math.max(
                          2,
                          Math.min(
                            96,
                            ((b.value - b.referenceRange[0] * 0.7) /
                              (b.referenceRange[1] * 1.3 - b.referenceRange[0] * 0.7 || 1)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1F2D4C] bg-[#121A2E] flex justify-end">
          <button
            onClick={closeDomainModal}
            className="px-4 py-2 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
