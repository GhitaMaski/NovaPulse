// src/screens/CrewListScreen.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissionStore } from '../stores/useMissionStore';
import { getAstronautHealth, getLastUpdate } from '../lib/selectors';
import { StatusPill } from '../components/StatusPill';
import { User, ArrowRight, Activity, Heart, Shield, Search } from 'lucide-react';

export const CrewListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentDay, result, readings, crew, scenarioPrediction, setSelectedCrewId } = useMissionStore();
  const [searchTerm, setSearchTerm] = useState('');

  const lastUpdate = getLastUpdate(currentDay, readings);

  const crewDetails = crew.map((c) => {
    const health = getAstronautHealth(c.id, currentDay, result.scores, crew, scenarioPrediction.results);
    const reading = readings.find((r) => r.crewId === c.id && r.day === currentDay);
    return {
      ...c,
      health,
      reading,
    };
  }).filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#2DD4BF]" />
            Flight Crew Roster
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Astronaut biosentry telemetry & autonomous resilience profiles (Day {currentDay})
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6BF]" />
          <input
            type="text"
            placeholder="Search crew..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#121A2E] border border-white/10 text-xs text-white placeholder-[#9AA6BF] focus:outline-none focus:border-[#2DD4BF]"
          />
        </div>
      </div>

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {crewDetails.map((c) => {
          const initials = c.name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2);

          const gradientRing =
            c.health.band === 'red'
              ? 'from-[#EF4444] to-[#F59E0B]'
              : c.health.band === 'amber'
              ? 'from-[#F59E0B] to-[#2DD4BF]'
              : 'from-[#2DD4BF] to-[#3B82F6]';

          return (
            <div
              key={c.id}
              onClick={() => {
                setSelectedCrewId(c.id);
                navigate(`/crew/${c.id}`);
              }}
              className="glass-panel-interactive rounded-2xl p-6 cursor-pointer flex flex-col justify-between space-y-5"
            >
              {/* Header with avatar & Status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar with gradient ring */}
                  <div
                    className={`relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr ${gradientRing} shadow-md`}
                  >
                    <div className="w-full h-full rounded-full bg-[#121A2E] flex items-center justify-center font-mono font-bold text-sm text-white">
                      {initials}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#9AA6BF]">
                      {c.id}{c.callsign && ` • Callsign: ${c.callsign}`}
                    </span>
                    <h2 className="text-sm font-bold text-white leading-tight mt-0.5">
                      {c.name}
                    </h2>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {c.role}
                    </span>
                  </div>
                </div>

                <StatusPill band={c.health.band} size="sm" />
              </div>

              {/* Central Health Score */}
              <div className="p-4 rounded-xl bg-[#0B1020]/70 border border-white/10 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9AA6BF] block">
                    {c.health.prediction ? 'Model Health Score' : 'Composite Health Score'}
                  </span>
                  <div className="text-3xl font-black text-white mt-0.5">
                    {c.health.score}
                    <span className="text-xs text-[#9AA6BF] font-normal"> / 100</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <span className="block text-[#2DD4BF] font-bold">
                    Last Update:
                  </span>
                  <span>{lastUpdate}</span>
                </div>
              </div>

              {/* Key Current Vitals Snapshot */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2 rounded-lg bg-[#121A2E] border border-white/5">
                  <span className="text-[10px] text-[#9AA6BF] block">HR</span>
                  <span className="font-bold text-white">{c.reading?.restingHr ?? '--'}</span>
                  <span className="text-[9px] text-slate-500 block">bpm</span>
                </div>
                <div className="p-2 rounded-lg bg-[#121A2E] border border-white/5">
                  <span className="text-[10px] text-[#9AA6BF] block">HRV</span>
                  <span className="font-bold text-white">{c.reading?.hrv ?? '--'}</span>
                  <span className="text-[9px] text-slate-500 block">ms</span>
                </div>
                <div className="p-2 rounded-lg bg-[#121A2E] border border-white/5">
                  <span className="text-[10px] text-[#9AA6BF] block">SpO2</span>
                  <span className="font-bold text-white">{c.reading?.spo2 ?? '--'}%</span>
                  <span className="text-[9px] text-slate-500 block">sat</span>
                </div>
              </div>

              {/* Footer Action */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-[#2DD4BF]">
                <span>Inspect Full Telemetry</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
