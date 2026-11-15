import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Layers, ZoomIn, Info } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import type { PhysiologicalDomainKey } from '../types';

type TimeWindow = '7d' | '30d' | '90d' | 'all';

interface ChartDataPoint {
  day: number;
  date: string;
  composite: number;
  cardiovascular: number;
  metabolic: number;
  neurocognitive: number;
  respiratory: number;
  immune: number;
}

export const TelemetryChart: React.FC = () => {
  const { currentDay, setCurrentDay, simulationData, selectedDomain, setSelectedDomain } =
    useSimulationStore();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');

  // Format dataset for recharts
  const fullChartData = useMemo<ChartDataPoint[]>(() => {
    return simulationData.map((d) => ({
      day: d.day,
      date: d.date,
      composite: d.compositeRiskScore,
      cardiovascular: d.domainScores.cardiovascular.score,
      metabolic: d.domainScores.metabolic.score,
      neurocognitive: d.domainScores.neurocognitive.score,
      respiratory: d.domainScores.respiratory.score,
      immune: d.domainScores.immune.score,
    }));
  }, [simulationData]);

  // Windowed data slice
  const chartData = useMemo(() => {
    if (timeWindow === 'all') return fullChartData;

    const span = timeWindow === '7d' ? 7 : timeWindow === '30d' ? 30 : 90;
    // Keep window centered or trailing near currentDay
    let startDay = Math.max(1, currentDay - Math.floor(span / 2));
    if (startDay + span - 1 > 200) {
      startDay = Math.max(1, 201 - span);
    }
    const endDay = Math.min(200, startDay + span - 1);

    return fullChartData.slice(startDay - 1, endDay);
  }, [fullChartData, timeWindow, currentDay]);

  const domainColors: Record<PhysiologicalDomainKey | 'composite', { stroke: string; fill: string; name: string }> = {
    composite: { stroke: '#2DD4BF', fill: '#2DD4BF', name: 'Composite Risk' },
    cardiovascular: { stroke: '#EF4444', fill: '#EF4444', name: 'Cardiovascular' },
    metabolic: { stroke: '#F59E0B', fill: '#F59E0B', name: 'Metabolic' },
    neurocognitive: { stroke: '#8B5CF6', fill: '#8B5CF6', name: 'Neuro-Cognitive' },
    respiratory: { stroke: '#3B82F6', fill: '#3B82F6', name: 'Respiratory' },
    immune: { stroke: '#EC4899', fill: '#EC4899', name: 'Immune/Inflammatory' },
  };

  const domainTabs: Array<{ key: PhysiologicalDomainKey | 'all'; label: string }> = [
    { key: 'all', label: 'All Streams' },
    { key: 'cardiovascular', label: 'Cardio' },
    { key: 'metabolic', label: 'Metabolic' },
    { key: 'neurocognitive', label: 'Neuro/Sleep' },
    { key: 'respiratory', label: 'Respiratory' },
    { key: 'immune', label: 'Immune' },
  ];

  return (
    <div className="w-full bg-[#121A2E] border border-[#1F2D4C] rounded-2xl p-4 lg:p-5 shadow-xl space-y-4">
      {/* Header controls: Stream selector & Time Zoom window */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2D4C]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2DD4BF]" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Longitudinal Multi-Stream Telemetry (200 Days)
          </h3>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            Click chart point to jump scrubber
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Stream Selector */}
          <div className="flex items-center bg-[#0B1020] rounded-lg p-0.5 border border-[#1F2D4C] text-xs">
            {domainTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedDomain(tab.key)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedDomain === tab.key
                    ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Window Zoom */}
          <div className="flex items-center bg-[#0B1020] rounded-lg p-0.5 border border-[#1F2D4C] text-xs font-mono">
            {(['7d', '30d', '90d', 'all'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeWindow === tw
                    ? 'bg-[#1F2D4C] text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tw.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={(e) => {
              const activePayload = (e as unknown as { activePayload?: Array<{ payload: ChartDataPoint }> })?.activePayload;
              if (activePayload && activePayload.length > 0) {
                const targetDay = activePayload[0].payload.day;
                setCurrentDay(targetDay);
              }
            }}
          >
            <defs>
              <linearGradient id="gradComposite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradCardio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradMetabolic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradNeuro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradResp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradImmune" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1F2D4C" vertical={false} />

            <XAxis
              dataKey="day"
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(v) => `D${v}`}
              tickLine={false}
              axisLine={{ stroke: '#1F2D4C' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: '#1F2D4C' }}
            />

            {/* Clinical Risk Boundary Thresholds */}
            <ReferenceLine
              y={75}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Critical (75)',
                position: 'right',
                fill: '#EF4444',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <ReferenceLine
              y={50}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Elevated (50)',
                position: 'right',
                fill: '#F59E0B',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
            <ReferenceLine
              y={25}
              stroke="#22C55E"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Optimal (25)',
                position: 'right',
                fill: '#22C55E',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />

            {/* Current Scrubber Synced Cursor Line */}
            <ReferenceLine
              x={currentDay}
              stroke="#2DD4BF"
              strokeWidth={2}
              label={{
                value: `Current: D${currentDay}`,
                position: 'top',
                fill: '#2DD4BF',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            />

            {/* Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="bg-[#0B1020] border border-[#2DD4BF]/50 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5 z-50">
                      <div className="flex items-center justify-between gap-4 border-b border-[#1F2D4C] pb-1 text-white font-bold">
                        <span>Day {data.day}</span>
                        <span className="text-slate-400 text-[10px]">{data.date}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[#2DD4BF] font-bold">
                        <span>Composite:</span>
                        <span>{data.composite}/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] pt-1 text-slate-300">
                        <div className="flex justify-between gap-2">
                          <span className="text-[#EF4444]">Cardio:</span>
                          <span>{data.cardiovascular}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#F59E0B]">Metabolic:</span>
                          <span>{data.metabolic}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#8B5CF6]">Neuro:</span>
                          <span>{data.neurocognitive}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#3B82F6]">Resp:</span>
                          <span>{data.respiratory}</span>
                        </div>
                        <div className="flex justify-between gap-2 col-span-2">
                          <span className="text-[#EC4899]">Immune:</span>
                          <span>{data.immune}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Render selected or all streams */}
            {(selectedDomain === 'all' || selectedDomain === 'cardiovascular') && (
              <Area
                type="monotone"
                dataKey="cardiovascular"
                stroke="#EF4444"
                strokeWidth={selectedDomain === 'cardiovascular' ? 3 : 1.5}
                fillOpacity={1}
                fill="url(#gradCardio)"
                dot={false}
              />
            )}

            {(selectedDomain === 'all' || selectedDomain === 'metabolic') && (
              <Area
                type="monotone"
                dataKey="metabolic"
                stroke="#F59E0B"
                strokeWidth={selectedDomain === 'metabolic' ? 3 : 1.5}
                fillOpacity={1}
                fill="url(#gradMetabolic)"
                dot={false}
              />
            )}

            {(selectedDomain === 'all' || selectedDomain === 'neurocognitive') && (
              <Area
                type="monotone"
                dataKey="neurocognitive"
                stroke="#8B5CF6"
                strokeWidth={selectedDomain === 'neurocognitive' ? 3 : 1.5}
                fillOpacity={1}
                fill="url(#gradNeuro)"
                dot={false}
              />
            )}

            {(selectedDomain === 'all' || selectedDomain === 'respiratory') && (
              <Area
                type="monotone"
                dataKey="respiratory"
                stroke="#3B82F6"
                strokeWidth={selectedDomain === 'respiratory' ? 3 : 1.5}
                fillOpacity={1}
                fill="url(#gradResp)"
                dot={false}
              />
            )}

            {(selectedDomain === 'all' || selectedDomain === 'immune') && (
              <Area
                type="monotone"
                dataKey="immune"
                stroke="#EC4899"
                strokeWidth={selectedDomain === 'immune' ? 3 : 1.5}
                fillOpacity={1}
                fill="url(#gradImmune)"
                dot={false}
              />
            )}

            {/* Composite Risk Line always prominent */}
            <Area
              type="monotone"
              dataKey="composite"
              stroke="#2DD4BF"
              strokeWidth={3}
              fillOpacity={selectedDomain === 'all' ? 0.35 : 0.05}
              fill="url(#gradComposite)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#2DD4BF] rounded-full inline-block" />
            <span className="text-white font-medium">Composite Allostatic Index</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-[#EF4444] rounded-full inline-block" />
            <span>Cardiovascular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-[#F59E0B] rounded-full inline-block" />
            <span>Metabolic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-[#8B5CF6] rounded-full inline-block" />
            <span>Neuro-Sleep</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-[#3B82F6] rounded-full inline-block" />
            <span>Respiratory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-[#EC4899] rounded-full inline-block" />
            <span>Immune</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <Info className="w-3 h-3 text-[#2DD4BF]" />
          <span>Real-time cross-filtering enabled</span>
        </div>
      </div>
    </div>
  );
};
