import React from 'react';
import {
  Heart,
  Zap,
  Moon,
  Wind,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import type { BiomarkerReading, PhysiologicalDomainKey } from '../types';

export const BiomarkerMatrix: React.FC = () => {
  const { currentDay, simulationData, openDomainModal } = useSimulationStore();
  const dayData = simulationData[currentDay - 1];

  if (!dayData) return null;

  const domainSections: Array<{
    key: PhysiologicalDomainKey;
    title: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      key: 'cardiovascular',
      title: 'Cardiovascular & Autonomic',
      icon: <Heart className="w-4 h-4 text-[#EF4444]" />,
      color: 'border-l-[#EF4444]',
    },
    {
      key: 'metabolic',
      title: 'Metabolic & Glycemic',
      icon: <Zap className="w-4 h-4 text-[#F59E0B]" />,
      color: 'border-l-[#F59E0B]',
    },
    {
      key: 'neurocognitive',
      title: 'Neuro-Cognitive & Sleep Architecture',
      icon: <Moon className="w-4 h-4 text-[#8B5CF6]" />,
      color: 'border-l-[#8B5CF6]',
    },
    {
      key: 'respiratory',
      title: 'Respiratory & Gas Exchange',
      icon: <Wind className="w-4 h-4 text-[#3B82F6]" />,
      color: 'border-l-[#3B82F6]',
    },
    {
      key: 'immune',
      title: 'Systemic Immune & Cytokine Load',
      icon: <ShieldAlert className="w-4 h-4 text-[#EC4899]" />,
      color: 'border-l-[#EC4899]',
    },
  ];

  return (
    <div className="w-full bg-[#121A2E] border border-[#1F2D4C] rounded-2xl p-4 lg:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2D4C]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            Continuous Biomarker Telemetry Grid
            <span className="text-xs font-mono font-normal text-slate-400">
              (Day {currentDay})
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            High-frequency physiological readings compared against 30-day baseline ranges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {domainSections.map((sec) => {
          const domainBiomarkers = Object.values(dayData.biomarkers).filter(
            (b) => b.domain === sec.key
          );
          const domainScore = dayData.domainScores[sec.key];

          return (
            <div
              key={sec.key}
              className={`p-3.5 rounded-xl bg-[#0B1020] border border-[#1F2D4C] border-l-4 ${sec.color} flex flex-col justify-between space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  {sec.icon}
                  <span className="truncate max-w-[130px]">{sec.title}</span>
                </div>
                <button
                  onClick={() => openDomainModal(sec.key)}
                  className="text-[10px] text-[#2DD4BF] hover:underline font-mono"
                >
                  {domainScore.score}/100
                </button>
              </div>

              <div className="space-y-2">
                {domainBiomarkers.map((b) => {
                  const isNormal = b.status === 'normal';
                  const isCritical = b.status === 'critical';

                  return (
                    <div
                      key={b.id}
                      className="p-2 rounded-lg bg-[#121A2E] border border-[#1F2D4C]/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 font-medium truncate max-w-[110px]" title={b.name}>
                          {b.shortName}
                        </span>
                        <div className="flex items-center gap-1 font-mono font-bold">
                          <span
                            className={
                              isCritical
                                ? 'text-[#EF4444]'
                                : !isNormal
                                ? 'text-[#F59E0B]'
                                : 'text-white'
                            }
                          >
                            {b.value.toFixed(1)} {b.unit}
                          </span>
                        </div>
                      </div>

                      {/* Mini reference bar */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Base: {b.baseline.toFixed(1)}</span>
                        <span
                          className={`flex items-center ${
                            b.zScore > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                          }`}
                        >
                          z: {b.zScore > 0 ? `+${b.zScore.toFixed(1)}` : b.zScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
