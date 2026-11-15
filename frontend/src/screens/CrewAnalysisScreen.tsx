// src/screens/CrewAnalysisScreen.tsx
import React from 'react';
import { useMissionStore } from '../stores/useMissionStore';
import { getCrewHealthIndex } from '../lib/selectors';
import type { Domain } from '../shared/types';
import { StatusPill } from '../components/StatusPill';
import {
  BarChart3,
  Users,
  Heart,
  Moon,
  Brain,
  Shield,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const comparisonDomains: [string, Domain][] = [
  ['Cardiovascular', 'cardio'],
  ['Immune System', 'immune'],
  ['Bone & Muscle', 'bone_muscle'],
  ['Behavioral/Sleep', 'behavioral'],
  ['Radiation', 'radiation'],
];
const crewColors = ['#2DD4BF', '#3B82F6', '#8B5CF6'];

export const CrewAnalysisScreen: React.FC = () => {
  const { currentDay, result, readings, crew, scenarioPrediction } = useMissionStore();

  const chiData = getCrewHealthIndex(currentDay, result.scores, crew, scenarioPrediction.results);

  // Compute aggregate stats across 3 crew on currentDay
  const dayReadings = readings.filter((r) => r.day === currentDay);
  const avgHr = Math.round(
    dayReadings.reduce((acc, r) => acc + r.restingHr, 0) / (dayReadings.length || 1)
  );
  const avgSleep = Number(
    (
      dayReadings.reduce((acc, r) => acc + r.sleepHours, 0) / (dayReadings.length || 1)
    ).toFixed(1)
  );
  const avgStress = Number(
    (
      dayReadings.reduce((acc, r) => acc + (r.stress ?? 2), 0) / (dayReadings.length || 1)
    ).toFixed(1)
  );

  const criticalMembersCount = chiData.astronauts.filter(
    (a) => a.band === 'red' || a.band === 'amber'
  ).length;

  const missionRiskLevel =
    chiData.missionStatus === 'red'
      ? 'High Risk'
      : chiData.missionStatus === 'amber'
      ? 'Elevated Risk'
      : 'Nominal';

  const comparisonData = comparisonDomains.map(([label, domain]) => ({
    domain: label,
    ...Object.fromEntries(chiData.astronauts.map(({ crewId, domainScores }) => [
      crewId, domainScores[domain]?.score,
    ])),
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2DD4BF]" />
            Inter-Crew Comparative Analysis
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Cross-sectional physiological parity and allostatic synchronization (Day {currentDay})
          </p>
        </div>

        <StatusPill band={chiData.missionStatus} size="lg" />
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Crew Health Index</span>
          <span className="text-2xl font-black text-white mt-1 block">{chiData.index}</span>
          <span className="text-[10px] text-[#2DD4BF]">{scenarioPrediction.results ? 'Mean of model scores' : 'Fleet mean'}</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Average HR</span>
          <span className="text-2xl font-black text-white mt-1 block">{avgHr}</span>
          <span className="text-[10px] text-slate-400">bpm</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Average Sleep</span>
          <span className="text-2xl font-black text-white mt-1 block">{avgSleep}</span>
          <span className="text-[10px] text-slate-400">hours/night</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Average Stress</span>
          <span className="text-2xl font-black text-white mt-1 block">{avgStress}</span>
          <span className="text-[10px] text-slate-400">scale / 10</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Watch Crew</span>
          <span className="text-2xl font-black text-[#EF4444] mt-1 block">
            {criticalMembersCount}
          </span>
          <span className="text-[10px] text-slate-400">of 3 members</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 font-mono">
          <span className="text-[10px] text-[#9AA6BF] uppercase block">Mission Risk</span>
          <span
            className={`text-sm font-bold mt-2 block truncate ${
              chiData.missionStatus === 'red'
                ? 'text-[#EF4444]'
                : chiData.missionStatus === 'amber'
                ? 'text-[#F59E0B]'
                : 'text-[#22C55E]'
            }`}
          >
            {missionRiskLevel}
          </span>
          <span className="text-[10px] text-slate-400">{scenarioPrediction.results ? 'Highest model status' : 'composite'}</span>
        </div>
      </div>

      {/* 3-Astronaut Comparison Bar Chart */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            3-Astronaut 5-Domain Parity Comparison
          </h3>
          <span className="text-xs font-mono text-[#9AA6BF]">Domain Scores (0-100)</span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis dataKey="domain" stroke="#9AA6BF" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#9AA6BF" fontSize={11} fontFamily="monospace" tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1020',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {crew.map((member, index) => (
                <Bar key={member.id} name={member.name} dataKey={member.id}
                  fill={crewColors[index % crewColors.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
