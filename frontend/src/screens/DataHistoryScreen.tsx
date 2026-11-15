// src/screens/DataHistoryScreen.tsx
import React, { useState, useMemo } from 'react';
import { useMissionStore } from '../stores/useMissionStore';
import { getCrewHealthIndex } from '../lib/selectors';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  Heart,
  Activity,
  Moon,
  Brain,
  Thermometer,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';

type MetricKey = 'chi' | 'hr' | 'hrv' | 'sleep' | 'stress' | 'temp';
type PeriodKey = '24h' | '7d' | '30d' | '90d' | 'all';

export const DataHistoryScreen: React.FC = () => {
  const { currentDay, setCurrentDay, readings, result, selectedCrewId, setSelectedCrewId, events, scenarioPrediction, crew: roster } =
    useMissionStore();

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('chi');
  const [period, setPeriod] = useState<PeriodKey>('all');

  const crew = roster.find((c) => c.id === selectedCrewId) ?? roster[0];
  const predictions = scenarioPrediction.results;

  // Slice readings based on period
  const chartData = useMemo(() => {
    let daysCount = 200;
    if (period === '24h') daysCount = 3;
    else if (period === '7d') daysCount = 7;
    else if (period === '30d') daysCount = 30;
    else if (period === '90d') daysCount = 90;

    let start = Math.max(1, currentDay - Math.floor(daysCount / 2));
    if (start + daysCount - 1 > 200) {
      start = Math.max(1, 201 - daysCount);
    }
    const end = Math.min(200, start + daysCount - 1);

    const filteredDays: Array<{
      day: number;
      date: string;
      value: number;
      baselineMin?: number;
      baselineMax?: number;
    }> = [];

    for (let d = start; d <= end; d++) {
      const r = readings.find((item) => item.crewId === crew.id && item.day === d);
      if (!r) continue;

      let val = 0;
      let bMin = 0;
      let bMax = 0;

      if (selectedMetric === 'chi') {
        const chi = getCrewHealthIndex(d, result.scores, roster, predictions);
        val = chi.index;
        bMin = 75;
        bMax = 100;
      } else if (selectedMetric === 'hr') {
        val = r.restingHr;
        bMin = crew.baselines.restingHr - 5;
        bMax = crew.baselines.restingHr + 8;
      } else if (selectedMetric === 'hrv') {
        val = r.hrv;
        bMin = crew.baselines.hrv - 10;
        bMax = crew.baselines.hrv + 15;
      } else if (selectedMetric === 'sleep') {
        val = r.sleepHours;
        bMin = 6.8;
        bMax = 8.5;
      } else if (selectedMetric === 'stress') {
        val = r.stress ?? 2;
        bMin = 1;
        bMax = 4;
      } else if (selectedMetric === 'temp') {
        val = r.coreTemp;
        bMin = 36.3;
        bMax = 37.2;
      }

      filteredDays.push({
        day: d,
        date: r.date,
        value: Number(val.toFixed(1)),
        baselineMin: bMin,
        baselineMax: bMax,
      });
    }

    return filteredDays;
  }, [readings, result.scores, crew, roster, currentDay, period, selectedMetric, predictions]);

  const metricConfig: Record<MetricKey, { label: string; unit: string; color: string; icon: React.ReactNode }> = {
    chi: { label: predictions ? 'Crew Health Index (model)' : 'Crew Health Index', unit: '/100', color: '#2DD4BF', icon: <Shield className="w-4 h-4 text-[#2DD4BF]" /> },
    hr: { label: 'Resting Heart Rate', unit: 'bpm', color: '#EF4444', icon: <Heart className="w-4 h-4 text-[#EF4444]" /> },
    hrv: { label: 'Heart Rate Variability', unit: 'ms', color: '#3B82F6', icon: <Activity className="w-4 h-4 text-[#3B82F6]" /> },
    sleep: { label: 'Sleep Duration', unit: 'hrs', color: '#8B5CF6', icon: <Moon className="w-4 h-4 text-[#8B5CF6]" /> },
    stress: { label: 'Operational Stress', unit: '/10', color: '#F59E0B', icon: <Brain className="w-4 h-4 text-[#F59E0B]" /> },
    temp: { label: 'Core Body Temperature', unit: '°C', color: '#EF4444', icon: <Thermometer className="w-4 h-4 text-[#EF4444]" /> },
  };

  const activeConf = metricConfig[selectedMetric];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-[#2DD4BF]" />
            Longitudinal Telemetry History
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Continuous multi-stream trend curves with normative baselines & space events
          </p>
        </div>

        {/* Crew selector */}
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

      {/* Control Bar: Metric tabs & Period filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 glass-panel rounded-2xl p-3">
        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(metricConfig) as MetricKey[]).map((mk) => (
            <button
              key={mk}
              onClick={() => setSelectedMetric(mk)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                selectedMetric === mk
                  ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border-[#2DD4BF]/50 font-bold shadow-[0_0_8px_rgba(45,212,191,0.2)]'
                  : 'bg-[#0B1020]/60 text-slate-400 border-white/5 hover:text-white'
              }`}
            >
              {metricConfig[mk].icon}
              <span>{metricConfig[mk].label}</span>
            </button>
          ))}
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1 bg-[#0B1020] rounded-xl p-1 border border-white/10 text-xs font-mono">
          {(['24h', '7d', '30d', '90d', 'all'] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                period === p
                  ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                  : 'text-[#9AA6BF] hover:text-white'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{activeConf.label}</span>
              <span className="font-mono text-xs text-[#2DD4BF]">({activeConf.unit})</span>
            </h3>
            <span className="text-[11px] text-[#9AA6BF]">
              Nominal baseline band shown in translucent overlay. Click graph to scrub mission day.
            </span>
          </div>

          <span className="text-xs font-mono text-[#9AA6BF]">
            Current: Day {currentDay}
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(e) => {
                const activePayload = (e as unknown as { activePayload?: Array<{ payload: { day: number } }> })?.activePayload;
                if (activePayload && activePayload.length > 0) {
                  setCurrentDay(activePayload[0].payload.day);
                }
              }}
            >
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeConf.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={activeConf.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />

              <XAxis
                dataKey="day"
                stroke="#9AA6BF"
                fontSize={11}
                fontFamily="monospace"
                tickFormatter={(d) => `D${d}`}
                tickLine={false}
              />
              <YAxis
                stroke="#9AA6BF"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
              />

              {/* Baseline Band reference area */}
              {chartData[0]?.baselineMin !== undefined && chartData[0]?.baselineMax !== undefined && (
                <ReferenceArea
                  y1={chartData[0].baselineMin}
                  y2={chartData[0].baselineMax}
                  fill="#22C55E"
                  fillOpacity={0.08}
                />
              )}

              {/* Space Event Markers */}
              {events.map((evt) => (
                <ReferenceLine
                  key={evt.id}
                  x={evt.startDay}
                  stroke="#F59E0B"
                  strokeDasharray="3 3"
                  label={{
                    value: evt.title ?? evt.type.replaceAll('_', ' '),
                    position: 'top',
                    fill: '#F59E0B',
                    fontSize: 10,
                    fontFamily: 'monospace',
                  }}
                />
              ))}

              {/* Current Scrubber Cursor */}
              <ReferenceLine
                x={currentDay}
                stroke="#2DD4BF"
                strokeWidth={2}
                label={{
                  value: `Day ${currentDay}`,
                  position: 'top',
                  fill: '#2DD4BF',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as { day: number; date: string; value: number };
                    return (
                      <div className="bg-[#0B1020] border border-[#2DD4BF]/50 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1">
                        <div className="text-white font-bold">Day {d.day} ({d.date})</div>
                        <div className="text-[#2DD4BF] font-black">
                          {activeConf.label}: {d.value} {activeConf.unit}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={activeConf.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#metricGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
