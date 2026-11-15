// src/screens/AlertsScreen.tsx
import React, { useState, useMemo } from 'react';
import { useMissionStore } from '../stores/useMissionStore';
import { StatusPill } from '../components/StatusPill';
import { ScenarioModelAlerts } from '../components/ScenarioModelAlerts';
import { getScenarioModelAlerts } from '../lib/selectors';
import {
  Bell,
  Filter,
  Sparkles,
  ShieldAlert,
  Flame,
  CloudAlert,
  Zap,
  Moon,
  Brain,
  CheckCircle2,
} from 'lucide-react';
import type { Severity, Domain } from '../shared/types';

export const AlertsScreen: React.FC = () => {
  const { currentDay, result, crew, scenarioPrediction, alertStatusOverrides, setSelectedAlertId, setSelectedCrewId } =
    useMissionStore();

  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [domainFilter, setDomainFilter] = useState<'all' | Domain>('all');

  const allAlerts = result.alerts;
  const modelAlerts = getScenarioModelAlerts(currentDay, crew, scenarioPrediction.results);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (domainFilter !== 'all' && a.domain !== domainFilter) return false;
      return true;
    });
  }, [allAlerts, severityFilter, domainFilter]);

  const domainIcons: Record<Domain, React.ReactNode> = {
    radiation: <Flame className="w-4 h-4 text-[#EF4444]" />,
    cardio: <Zap className="w-4 h-4 text-[#F59E0B]" />,
    immune: <ShieldAlert className="w-4 h-4 text-[#EF4444]" />,
    behavioral: <Moon className="w-4 h-4 text-[#8B5CF6]" />,
    bone_muscle: <Brain className="w-4 h-4 text-[#2DD4BF]" />,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#EF4444]" />
            Clinical & Environmental Alert Archive
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Autonomous flight surgeon priority notifications across all 200 mission days
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity filter */}
          <div className="flex items-center gap-1 bg-[#121A2E] rounded-xl p-1 border border-white/10 text-xs">
            {(['all', 'critical', 'warning', 'watch'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  severityFilter === s
                    ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                    : 'text-[#9AA6BF] hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Domain filter */}
          <div className="flex items-center gap-1 bg-[#121A2E] rounded-xl px-2.5 py-1.5 border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <select
              aria-label="Filter alerts by domain"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as 'all' | Domain)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#121A2E] text-white">All Domains</option>
              <option value="radiation" className="bg-[#121A2E] text-white">Radiation</option>
              <option value="cardio" className="bg-[#121A2E] text-white">Cardiovascular</option>
              <option value="immune" className="bg-[#121A2E] text-white">Immune</option>
              <option value="behavioral" className="bg-[#121A2E] text-white">Behavioral / Sleep</option>
              <option value="bone_muscle" className="bg-[#121A2E] text-white">Bone & Muscle</option>
            </select>
          </div>
        </div>
      </div>

      {scenarioPrediction.results && (
        <section className="glass-panel rounded-2xl p-4 space-y-3" aria-labelledby="scenario-model-alerts">
          <h2 id="scenario-model-alerts" className="text-sm font-bold">Scenario model alerts · Day {currentDay}</h2>
          {modelAlerts.length > 0
            ? <ScenarioModelAlerts alerts={modelAlerts} selectCrew={setSelectedCrewId} />
            : <p className="text-xs text-[#9AA6BF]">The models reported no warnings or anomalies for this day.</p>}
        </section>
      )}

      {/* Alerts Grid */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center text-[#9AA6BF]">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#22C55E] mb-2" />
            <p className="text-sm font-semibold text-white">No alerts match the chosen filters.</p>
          </div>
        ) : (
          filteredAlerts.map((alt) => {
            const currentStatus = alertStatusOverrides[alt.id] ?? alt.status;
            const isCurrentDay = alt.day === currentDay;

            return (
              <div
                key={alt.id}
                className={`glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCurrentDay
                    ? 'border-[#2DD4BF]/50 bg-[#121A2E]/90 ring-1 ring-[#2DD4BF]/30 shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#0B1020] border border-white/10 shrink-0">
                    {domainIcons[alt.domain]}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill severity={alt.severity} size="sm" />
                      <span className="font-mono text-xs text-[#2DD4BF] font-bold">
                        {alt.crewId === 'CREW-01' ? 'Nadia (CREW-01)' : alt.crewId === 'CREW-02' ? 'Leo (CREW-02)' : alt.crewId === 'CREW-03' ? 'Aiko (CREW-03)' : 'Entire Crew'}
                      </span>
                      <span className="text-xs font-mono text-[#9AA6BF]">
                        • Detection: Day {alt.day}
                      </span>
                      {isCurrentDay && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40">
                          Current Day Active
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm font-bold text-white">{alt.title}</h2>
                    <p className="text-xs text-slate-300 max-w-2xl">{alt.likelyCause}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                  <span className="text-xs font-mono text-[#9AA6BF]">
                    Status: <strong className={currentStatus === 'resolved' ? 'text-[#22C55E]' : currentStatus === 'acknowledged' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>{currentStatus.toUpperCase()}</strong>
                  </span>

                  <button
                    onClick={() => setSelectedAlertId(alt.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#2DD4BF] text-[#0B1020] hover:bg-[#2DD4BF]/90 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-[0_0_10px_rgba(45,212,191,0.2)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Why this alert?</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
