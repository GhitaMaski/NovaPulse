import React from 'react';
import {
  Heart,
  Zap,
  Moon,
  Wind,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  Flame,
} from 'lucide-react';
import type { PhysiologicalDomainKey, DomainRiskScore, RiskCategory } from '../types';
import { useSimulationStore } from '../store/useSimulationStore';

interface GaugeProps {
  score: number;
  category: RiskCategory;
  name: string;
  domainKey: PhysiologicalDomainKey;
  delta7d: number;
  primaryContributor: string;
  onInspect: (key: PhysiologicalDomainKey) => void;
  icon: React.ReactNode;
}

const categoryThemeConfig: Record<
  RiskCategory,
  {
    stroke: string;
    text: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  optimal: {
    stroke: '#22C55E',
    text: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/30',
    label: 'Optimal',
  },
  guarded: {
    stroke: '#3B82F6',
    text: 'text-[#3B82F6]',
    bg: 'bg-[#3B82F6]/10',
    border: 'border-[#3B82F6]/30',
    label: 'Guarded',
  },
  elevated: {
    stroke: '#F59E0B',
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/30',
    label: 'Elevated',
  },
  critical: {
    stroke: '#EF4444',
    text: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/15',
    border: 'border-[#EF4444]/40',
    label: 'Critical',
  },
};

export const SingleDomainGauge: React.FC<GaugeProps> = ({
  score,
  category,
  name,
  domainKey,
  delta7d,
  primaryContributor,
  onInspect,
  icon,
}) => {
  const config = categoryThemeConfig[category];

  // SVG Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 260 degrees (leaving open bottom)
  const arcLength = circumference * (260 / 360);
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  return (
    <div
      onClick={() => onInspect(domainKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onInspect(domainKey);
        }
      }}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-[#121A2E] border border-[#1F2D4C] hover:border-[#2DD4BF]/50 transition-all cursor-pointer shadow-lg hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${
        category === 'critical' ? 'ring-1 ring-[#EF4444]/40' : ''
      }`}
    >
      {/* Header: Icon + Domain title + Category badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl border ${config.bg} ${config.border} ${config.text}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white group-hover:text-[#2DD4BF] transition-colors leading-tight">
              {name}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Domain 0–100 Index</span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}
        >
          {config.label}
        </span>
      </div>

      {/* Center: Radial Meter */}
      <div className="flex items-center justify-center my-3 relative">
        <svg
          className="w-28 h-28 transform -rotate-130"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1F2D4C"
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={config.stroke}
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Numeric value readout inside meter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
            {score}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-medium">
            / 100 Risk
          </span>
        </div>
      </div>

      {/* Footer: Trend Delta & Contributor preview */}
      <div className="pt-2 border-t border-[#1F2D4C]/70 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">7-Day Trajectory</span>
          <div
            className={`flex items-center gap-1 font-mono text-xs font-semibold ${
              delta7d > 0
                ? 'text-[#EF4444]'
                : delta7d < 0
                ? 'text-[#22C55E]'
                : 'text-slate-400'
            }`}
          >
            {delta7d > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : delta7d < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{delta7d > 0 ? `+${delta7d}` : delta7d}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 truncate max-w-[140px]" title={primaryContributor}>
            {primaryContributor}
          </span>
          <span className="text-[#2DD4BF] group-hover:translate-x-0.5 transition-transform flex items-center">
            Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

export const RiskGaugesGrid: React.FC = () => {
  const { currentDay, simulationData, openDomainModal, openAlertDrawer, activeAlert } =
    useSimulationStore();

  const dayData = simulationData[currentDay - 1];
  if (!dayData) return null;

  const domainIcons: Record<PhysiologicalDomainKey, React.ReactNode> = {
    cardiovascular: <Heart className="w-4 h-4" />,
    metabolic: <Zap className="w-4 h-4" />,
    neurocognitive: <Moon className="w-4 h-4" />,
    respiratory: <Wind className="w-4 h-4" />,
    immune: <ShieldAlert className="w-4 h-4" />,
  };

  const compositeConfig = categoryThemeConfig[dayData.category];

  return (
    <section className="w-full space-y-4" aria-label="Physiological Risk Domains">
      {/* Composite Risk Overview Bar */}
      <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#121A2E] via-[#152038] to-[#121A2E] border border-[#1F2D4C] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center font-mono font-black ${compositeConfig.bg} ${compositeConfig.border} ${compositeConfig.text} shadow-inner`}
          >
            <span className="text-2xl leading-none">{dayData.compositeRiskScore}</span>
            <span className="text-[9px] uppercase tracking-tighter opacity-80 mt-0.5">Risk</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Composite Allostatic Load Index
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${compositeConfig.bg} ${compositeConfig.border} ${compositeConfig.text}`}
              >
                {compositeConfig.label} Status
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              Weighted cross-domain integration of 20 continuous digital biomarkers across autonomic, metabolic, sleep architecture, pulmonary, and cytokine markers.
            </p>
          </div>
        </div>

        {/* Alert Callout if present */}
        {dayData.activeAlert && (
          <button
            onClick={() => openAlertDrawer(dayData.activeAlert)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              dayData.activeAlert.severity === 'critical'
                ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/30 animate-pulse'
                : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 hover:bg-[#F59E0B]/30'
            }`}
          >
            <Flame className="w-4 h-4" />
            <div className="text-left">
              <div className="font-bold">Active Risk Attribution Detected</div>
              <div className="text-[10px] opacity-90">Click to view SHAP evidence weights</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {/* 5 Domain Risk Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {(Object.entries(dayData.domainScores) as [PhysiologicalDomainKey, DomainRiskScore][]).map(
          ([key, domain]) => (
            <SingleDomainGauge
              key={key}
              score={domain.score}
              category={domain.category}
              name={domain.name.split('&')[0].trim()}
              domainKey={key}
              delta7d={domain.delta7d}
              primaryContributor={domain.primaryContributor}
              onInspect={openDomainModal}
              icon={domainIcons[key]}
            />
          )
        )}
      </div>
    </section>
  );
};
