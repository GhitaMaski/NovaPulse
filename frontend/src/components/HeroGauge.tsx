// src/components/HeroGauge.tsx
import React from 'react';
import { StatusPill } from './StatusPill';
import type { Band } from '../shared/types';
import type { AstronautHealth } from '../lib/selectors';

interface HeroGaugeProps {
  score: number; // 0-100
  missionStatus: Band;
  astronauts: AstronautHealth[];
  onAstronautClick?: (crewId: string) => void;
}

export const HeroGauge: React.FC<HeroGaugeProps> = ({
  score,
  missionStatus,
  astronauts,
  onAstronautClick,
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcDegree = 260;
  const arcLength = circumference * (arcDegree / 360);
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  const strokeColor =
    missionStatus === 'red'
      ? '#EF4444'
      : missionStatus === 'amber'
      ? '#F59E0B'
      : '#2DD4BF';

  return (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none">
      {/* SVG Arc Gauge */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Soft radial glow behind gauge */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-25 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: strokeColor }}
        />

        <svg
          className="w-full h-full transform -rotate-130"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="60%" stopColor={strokeColor} />
              <stop offset="100%" stopColor={missionStatus === 'red' ? '#EF4444' : '#3B82F6'} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Gradient Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="url(#heroGradient)"
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Orbiting Crew Indicator Dots */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {astronauts.map((ast, idx) => {
            const orbitClass = idx === 0 ? 'animate-orbit-1' : idx === 1 ? 'animate-orbit-2' : 'animate-orbit-3';
            const dotColor = ast.band === 'red' ? '#EF4444' : ast.band === 'amber' ? '#F59E0B' : '#2DD4BF';

            return (
              <div
                key={ast.crewId}
                className={`absolute w-3.5 h-3.5 rounded-full border-2 border-[#0B1020] shadow-md pointer-events-auto cursor-pointer transition-transform hover:scale-150 ${orbitClass}`}
                style={{ backgroundColor: dotColor }}
                title={`${ast.name} (${ast.crewId}): ${ast.score}/100`}
                onClick={() => onAstronautClick?.(ast.crewId)}
              />
            );
          })}
        </div>

        {/* Central Metric Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-5xl font-black tracking-tight text-[#E6EAF2] font-mono leading-none">
            {score}
          </span>
          <span className="text-[10px] font-bold tracking-widest text-[#9AA6BF] uppercase mt-1">
            Index / 100
          </span>
        </div>
      </div>

      {/* Mission Status Pill beneath Hero Gauge */}
      <div className="mt-2 flex flex-col items-center gap-1.5">
        <StatusPill band={missionStatus} size="lg" />
        <span className="text-[11px] text-[#9AA6BF] tracking-wider uppercase font-mono">
          Overall Mission Health Status
        </span>
      </div>
    </div>
  );
};
