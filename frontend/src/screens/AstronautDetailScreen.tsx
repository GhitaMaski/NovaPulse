// src/screens/AstronautDetailScreen.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMissionStore } from '../stores/useMissionStore';
import { getAstronautHealth } from '../lib/selectors';
import { StatusPill } from '../components/StatusPill';
import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Moon,
  Dumbbell,
  Brain,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Shield,
  CircleDot,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit: string;
  baseline: string | number;
  delta: string | number;
  deltaDirection: 'good' | 'bad' | 'neutral';
  history: Array<{ v: number }>;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  baseline,
  delta,
  deltaDirection,
  history,
  icon,
}) => {
  const isBad = deltaDirection === 'bad';
  const isGood = deltaDirection === 'good';

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#9AA6BF] font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-0.5 border ${
            isBad
              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
              : isGood
              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
              : 'bg-white/5 text-[#9AA6BF] border-white/10'
          }`}
        >
          {isBad ? <TrendingUp className="w-3 h-3" /> : isGood ? <TrendingDown className="w-3 h-3" /> : null}
          {delta} vs base
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-black font-mono text-white tracking-tight">
            {value}
          </span>
          <span className="text-xs text-[#9AA6BF] ml-1 font-mono">{unit}</span>
        </div>

        {/* 7-day mini sparkline */}
        <div className="w-20 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isBad ? '#EF4444' : '#2DD4BF'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-[10px] font-mono text-[#9AA6BF] border-t border-white/5 pt-1.5">
        Personal Baseline: <strong className="text-white">{baseline} {unit}</strong>
      </div>
    </div>
  );
};

export const AstronautDetailScreen: React.FC = () => {
  const { crewId: paramCrewId } = useParams();
  const navigate = useNavigate();
  const { currentDay, result, readings, crew: roster, scenarioPrediction, selectedCrewId, setSelectedCrewId } =
    useMissionStore();

  const activeId = paramCrewId ?? selectedCrewId;
  const crew = roster.find((c) => c.id === activeId) ?? roster[0];

  const currentReading =
    readings.find((r) => r.crewId === crew.id && r.day === currentDay) ?? readings[0];

  const health = getAstronautHealth(crew.id, currentDay, result.scores, roster, scenarioPrediction.results);

  // Trailing 7 days readings for sparklines
  const startDay = Math.max(1, currentDay - 6);
  const trailing = readings
    .filter((r) => r.crewId === crew.id && r.day >= startDay && r.day <= currentDay)
    .sort((a, b) => a.day - b.day);

  // 5-Domain Radar Data
  const radarData = [
    { domain: 'Cardio', score: health.domainScores.cardio?.score ?? 85 },
    { domain: 'Immune', score: health.domainScores.immune?.score ?? 85 },
    { domain: 'Bone/Muscle', score: health.domainScores.bone_muscle?.score ?? 85 },
    { domain: 'Behavioral', score: health.domainScores.behavioral?.score ?? 85 },
    { domain: 'Radiation', score: health.domainScores.radiation?.score ?? 85 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Profile Header */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/crew')}
            className="p-2 rounded-xl bg-[#121A2E] hover:bg-[#1A2540] border border-white/10 text-[#9AA6BF] hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#2DD4BF] font-bold">
                {crew.id}
              </span>
              {crew.callsign && <span className="text-xs text-[#9AA6BF]">• Callsign: {crew.callsign}</span>}
              <StatusPill band={health.band} size="sm" />
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">{crew.name}</h1>
            <p className="text-xs text-[#9AA6BF]">
              {crew.role}
              {crew.age !== undefined && ` • Age ${crew.age}`}
              {crew.bloodType && ` • Blood Type ${crew.bloodType}`}
            </p>
          </div>
        </div>

        {/* Crew Switcher Buttons */}
        <div className="flex items-center gap-2">
          {roster.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCrewId(c.id);
                navigate(`/crew/${c.id}`);
              }}
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

      {/* Main Grid: Vitals + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5-Domain Radar + Health Index */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              5-Domain Biosentry Radar
            </h3>
            <span className="text-xs font-mono text-[#2DD4BF] font-bold">
              {health.score}/100 {health.prediction ? 'Model health' : 'CHI'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis
                  dataKey="domain"
                  stroke="#9AA6BF"
                  fontSize={11}
                  tickLine={false}
                />
                <Radar
                  name="Astronaut"
                  dataKey="score"
                  stroke="#2DD4BF"
                  fill="#2DD4BF"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Domain scores */}
          <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] pt-2 border-t border-white/10">
            {radarData.map((d) => (
              <div key={d.domain} className="p-1 rounded bg-[#0B1020] border border-white/5">
                <span className="text-slate-500 block truncate">{d.domain}</span>
                <span className="font-bold text-white">{d.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Vitals Cards Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: Cardiovascular & Pulmonary Vitals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF] mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#EF4444]" />
              Cardiovascular & Respiratory Vitals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <MetricCard
                label="Heart Rate"
                value={currentReading.restingHr}
                unit="bpm"
                baseline={crew.baselines.restingHr}
                delta={`${currentReading.restingHr >= crew.baselines.restingHr ? '+' : ''}${currentReading.restingHr - crew.baselines.restingHr}`}
                deltaDirection={currentReading.restingHr > crew.baselines.restingHr + 10 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.restingHr }))}
                icon={<Heart className="w-3.5 h-3.5 text-[#EF4444]" />}
              />
              <MetricCard
                label="HRV (rMSSD)"
                value={currentReading.hrv}
                unit="ms"
                baseline={crew.baselines.hrv}
                delta={`${currentReading.hrv >= crew.baselines.hrv ? '+' : ''}${currentReading.hrv - crew.baselines.hrv}`}
                deltaDirection={currentReading.hrv < crew.baselines.hrv - 15 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.hrv }))}
                icon={<Activity className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              />
              <MetricCard
                label="Blood Pressure"
                value={`${currentReading.sbp}/${currentReading.dbp}`}
                unit="mmHg"
                baseline={`${crew.baselines.sbp}/${crew.baselines.dbp}`}
                delta={`+${currentReading.sbp - crew.baselines.sbp}`}
                deltaDirection={currentReading.sbp > 135 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.sbp }))}
                icon={<Activity className="w-3.5 h-3.5 text-[#F59E0B]" />}
              />
              <MetricCard
                label="Blood Oxygen (SpO2)"
                value={currentReading.spo2}
                unit="%"
                baseline={crew.baselines.spo2}
                delta={`${(currentReading.spo2 - crew.baselines.spo2).toFixed(1)}`}
                deltaDirection={currentReading.spo2 < 95 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.spo2 }))}
                icon={<Wind className="w-3.5 h-3.5 text-[#3B82F6]" />}
              />
              <MetricCard
                label="Core Temperature"
                value={currentReading.coreTemp}
                unit="°C"
                baseline={crew.baselines.coreTemp}
                delta={`+${(currentReading.coreTemp - crew.baselines.coreTemp).toFixed(1)}`}
                deltaDirection={currentReading.coreTemp > 37.5 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.coreTemp }))}
                icon={<Thermometer className="w-3.5 h-3.5 text-[#EF4444]" />}
              />
              <MetricCard
                label="Respiratory Rate"
                value={currentReading.respRate}
                unit="brpm"
                baseline={crew.baselines.respRate}
                delta={`+${(currentReading.respRate - crew.baselines.respRate).toFixed(1)}`}
                deltaDirection={currentReading.respRate > 18 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.respRate }))}
                icon={<Wind className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              />
            </div>
          </div>

          {/* Section: Activity & Sleep */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF] mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4 text-[#8B5CF6]" />
              Sleep Architecture & Exercise Load
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <MetricCard
                label="Sleep Hours"
                value={currentReading.sleepHours}
                unit="hrs"
                baseline={crew.baselines.sleepHours}
                delta={`${(currentReading.sleepHours - crew.baselines.sleepHours).toFixed(1)}`}
                deltaDirection={currentReading.sleepHours < 5.5 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.sleepHours }))}
                icon={<Moon className="w-3.5 h-3.5 text-[#8B5CF6]" />}
              />
              <MetricCard
                label="Sleep Quality"
                value={currentReading.sleepEff}
                unit="%"
                baseline={91}
                delta={`${(currentReading.sleepEff - 91).toFixed(0)}`}
                deltaDirection={currentReading.sleepEff < 75 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.sleepEff }))}
                icon={<Moon className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              />
              <MetricCard
                label="Exercise (min)"
                value={currentReading.exerciseMin}
                unit="min"
                baseline={75}
                delta={`${currentReading.exerciseMin - 75}`}
                deltaDirection={currentReading.exerciseMin < 40 ? 'bad' : 'neutral'}
                history={trailing.map((t) => ({ v: t.exerciseMin }))}
                icon={<Dumbbell className="w-3.5 h-3.5 text-[#22C55E]" />}
              />
            </div>
          </div>

          {/* Section: General State */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF] mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#F59E0B]" />
              General State (Stress, Fatigue, Mood)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="glass-panel rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA6BF]">Operational Stress</span>
                  <span className="font-mono font-bold text-white">{currentReading.stress ?? 2}/10</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B1020] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (currentReading.stress ?? 2) > 6 ? 'bg-[#EF4444]' : 'bg-[#2DD4BF]'
                    }`}
                    style={{ width: `${((currentReading.stress ?? 2) / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA6BF]">Fatigue Index</span>
                  <span className="font-mono font-bold text-white">{currentReading.fatigue ?? 2}/10</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B1020] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (currentReading.fatigue ?? 2) > 6 ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                    }`}
                    style={{ width: `${((currentReading.fatigue ?? 2) / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA6BF]">Psychological Mood</span>
                  <span className="font-mono font-bold text-white">{currentReading.mood ?? 8}/10</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B1020] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#22C55E]"
                    style={{ width: `${((currentReading.mood ?? 8) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
