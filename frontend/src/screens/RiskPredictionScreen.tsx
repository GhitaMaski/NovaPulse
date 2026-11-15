// src/screens/RiskPredictionScreen.tsx
import React, { useMemo } from 'react';
import { ScenarioModelPredictions, TrainedModelPredictions } from '../components/TrainedModelPredictions';
import { useMissionStore } from '../stores/useMissionStore';
import { predict72hRisk } from '../lib/risk';
import { predictionKey, preparePredictionRows } from '../lib/predictions';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Heart,
  Moon,
  Shield,
  Info,
} from 'lucide-react';

export const RiskPredictionScreen: React.FC = () => {
  const { currentDay, readings, crew: roster, selectedCrewId, setSelectedCrewId, dataSource, scenarioPrediction } = useMissionStore();

  const crew = roster.find((c) => c.id === selectedCrewId) ?? roster[0];
  const modelRows = useMemo(() => preparePredictionRows(readings), [readings]);
  const modelInput = modelRows.find(({ key }) => key === predictionKey(crew.id, currentDay))?.input;
  const riskProfile = predict72hRisk(crew.id, currentDay, readings);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2DD4BF]" />
            Risk Prediction
          </h1>
        </div>

        {/* Crew Selector */}
        <div className="flex items-center gap-2">
          {roster.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCrewId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                c.id === crew.id
                  ? 'bg-[#2DD4BF] text-[#0B1020] border-[#2DD4BF] font-bold'
                  : 'bg-[#121A2E] text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {dataSource === 'scenario' ? (
        <ScenarioModelPredictions crewId={crew.id} day={currentDay} input={modelInput} scenario={scenarioPrediction} />
      ) : (
        <TrainedModelPredictions
          crewId={crew.id}
          day={currentDay}
          input={modelInput}
          fromBackend={dataSource === 'backend' || dataSource === 'connecting'}
        />
      )}

      <h2 className="text-base font-bold text-white">72-Hour Telemetry Trend Estimate</h2>

      {/* Mandatory Disclaimer Box */}
      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B]">
        <Info className="w-4 h-4 shrink-0" />
        <span className="font-semibold">{riskProfile.disclaimer}</span>
      </div>

      {/* Hero 72h Overall Risk Card */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div
            className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-mono font-black ${
              riskProfile.overall72hRisk >= 60
                ? 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]'
                : riskProfile.overall72hRisk >= 35
                ? 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
                : 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]'
            }`}
          >
            <span className="text-3xl leading-none">{riskProfile.overall72hRisk}%</span>
            <span className="text-[9px] uppercase tracking-tighter opacity-80 mt-1">72h Risk</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#2DD4BF] uppercase">
                Horizon: {riskProfile.categories[0].horizon}
              </span>
              <span className="text-xs text-[#9AA6BF]">({crew.name})</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Cumulative Allostatic Prognosis
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Forecasted physiological risk accumulation derived from continuous multi-stream slopes across resting HR drift, autonomic vagal suppression, and circadian deficit.
            </p>
          </div>
        </div>

        {/* Risk meter bar */}
        <div className="w-full md:w-64 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-[#9AA6BF]">
            <span>Low (0%)</span>
            <span>Critical (100%)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#0B1020] overflow-hidden border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                riskProfile.overall72hRisk >= 60
                  ? 'bg-[#EF4444]'
                  : riskProfile.overall72hRisk >= 35
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#22C55E]'
              }`}
              style={{ width: `${riskProfile.overall72hRisk}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Predicted Risk Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {riskProfile.categories.map((cat, idx) => {
          const isHigh = cat.riskScore >= 60;
          const isMed = cat.riskScore >= 35;

          const themeColor = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#22C55E';

          return (
            <div
              key={idx}
              className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#9AA6BF] uppercase tracking-wider block">
                    Forecast Horizon {cat.horizon}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{cat.category}</h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                    cat.trendDirection === 'increasing'
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                  }`}
                >
                  Trend: {cat.trendDirection}
                </span>
              </div>

              {/* Big Score Readout */}
              <div className="p-4 rounded-xl bg-[#0B1020]/70 border border-white/10 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-[#9AA6BF] block uppercase tracking-wider">
                    Trend Risk Score
                  </span>
                  <div className="text-3xl font-black text-white mt-0.5">
                    {cat.riskScore}%
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-[#9AA6BF] block text-[10px]">Slope (m)</span>
                  <span className="font-bold text-white">{cat.trendSlope > 0 ? `+${cat.trendSlope}` : cat.trendSlope} /d</span>
                </div>
              </div>

              {/* Contributing Trend Indicators */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#9AA6BF] block font-mono">
                  Driving Indicators:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {cat.keyContributors.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] shrink-0 mt-1.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mandatory bottom label */}
              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-500 italic">
                {cat.disclaimer}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
