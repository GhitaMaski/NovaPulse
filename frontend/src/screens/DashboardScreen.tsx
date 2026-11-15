// src/screens/DashboardScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissionStore } from '../stores/useMissionStore';
import { getCrewHealthIndex, getAnomalies, getScenarioModelAlerts } from '../lib/selectors';
import { HeroGauge } from '../components/HeroGauge';
import { ScenarioModelAlerts } from '../components/ScenarioModelAlerts';
import { StatusPill } from '../components/StatusPill';
import {
  AlertTriangle,
  Binary,
  Users,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Heart,
  Moon,
  Sparkles,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentDay, result, readings, crew, scenarioPrediction, alertStatusOverrides, setSelectedCrewId, setSelectedAlertId } =
    useMissionStore();

  const predictions = scenarioPrediction.results;
  const crewIndexData = getCrewHealthIndex(currentDay, result.scores, crew, predictions);
  const modelAlerts = getScenarioModelAlerts(currentDay, crew, predictions);
  const anomalyCount = predictions
    ? crewIndexData.astronauts.filter(({ prediction }) => prediction?.anomaly === 'Anomaly Detected').length
    : getAnomalies(currentDay, result.scores, readings, crew).length;

  // Filter alerts for current day
  const dayAlerts = result.alerts.filter((a) => a.day === currentDay);
  const openAlerts = dayAlerts.filter((a) => (alertStatusOverrides[a.id] ?? a.status) === 'open');

  const criticalAstronauts = crewIndexData.astronauts.filter(
    (a) => a.band === 'red' || a.band === 'amber'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hero Radial Gauge Card */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9AA6BF]">
                Fleet Health Index
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {predictions ? 'Mean of trained model scores' : 'Real-Time Autonomous Scoring'}
              </span>
            </div>
            <button
              onClick={() => navigate('/analysis')}
              className="text-xs text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
            >
              Analyze <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <HeroGauge
            score={crewIndexData.index}
            missionStatus={crewIndexData.missionStatus}
            astronauts={crewIndexData.astronauts}
            onAstronautClick={(id) => {
              setSelectedCrewId(id);
              navigate(`/crew/${id}`);
            }}
          />

          <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center font-mono">
            {crewIndexData.astronauts.map((ast) => (
              <button
                key={ast.crewId}
                onClick={() => {
                  setSelectedCrewId(ast.crewId);
                  navigate(`/crew/${ast.crewId}`);
                }}
                className="p-2 rounded-xl bg-[#0B1020]/60 hover:bg-[#121A2E] border border-white/5 transition-all text-left"
              >
                <div className="text-[10px] text-[#9AA6BF] truncate">{ast.name.split(' ')[0]}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-bold text-sm text-white">{ast.score}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ast.band === 'red' ? 'bg-[#EF4444]' : ast.band === 'amber' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bento Right Column: Telemetry Cards & Active Alerts */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#9AA6BF] font-mono">
                  Active Alerts
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {openAlerts.length + modelAlerts.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#9AA6BF] font-mono">
                  {predictions ? 'Model Anomalies' : 'Z-Score Anomalies'}
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {anomalyCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                <Binary className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#9AA6BF] font-mono">
                  Watch Astronauts
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {criticalAstronauts.length} / 3
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="glass-panel rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span>Alerts (Day {currentDay})</span>
              </h3>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
              >
                All Alerts <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 my-3 flex-1">
              {modelAlerts.length > 0 && <ScenarioModelAlerts alerts={modelAlerts} selectCrew={setSelectedCrewId} />}
              {dayAlerts.length === 0 && modelAlerts.length === 0 ? (
                <div className="text-center py-8 text-[#9AA6BF] space-y-1">
                  <p className="text-xs">No active alerts on Mission Day {currentDay}.</p>
                  <p className="text-[11px] text-slate-500">
                    Use the scrubber or scenario buttons (Radiation, CO2, Infection, Sleep) to inject events.
                  </p>
                </div>
              ) : (
                dayAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl bg-[#0B1020]/70 border border-white/10 hover:border-[#2DD4BF]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusPill severity={alt.severity} size="sm" />
                        <span className="font-mono text-xs text-[#9AA6BF] font-bold">
                          {alt.crewId}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{alt.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{alt.likelyCause}</p>
                    </div>

                    <button
                      onClick={() => setSelectedAlertId(alt.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF] hover:bg-[#2DD4BF]/25 text-xs font-semibold flex items-center gap-1 shrink-0 self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Why this alert?</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#9AA6BF]">
              <span>{predictions ? 'Scenario predictions from the mission API' : 'Autonomous Diagnostics'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Bento: Critical Astronauts Cards + Anomaly Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {crewIndexData.astronauts.map((ast) => (
          <div
            key={ast.crewId}
            onClick={() => {
              setSelectedCrewId(ast.crewId);
              navigate(`/crew/${ast.crewId}`);
            }}
            className="glass-panel-interactive rounded-2xl p-5 cursor-pointer space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#9AA6BF]">
                  {ast.crewId}
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{ast.name}</h3>
              </div>
              <StatusPill band={ast.band} size="sm" />
            </div>

            <div className="flex items-baseline justify-between font-mono">
              <div>
                <span className="text-xs text-[#9AA6BF] block">Health Score</span>
                <span className="text-3xl font-black text-white">{ast.score}</span>
                <span className="text-xs text-[#9AA6BF]">/100</span>
              </div>
              <span className="text-xs text-[#2DD4BF] flex items-center gap-1 font-semibold">
                View Vitals <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* 5 Domain mini status */}
            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-white/10 text-center font-mono text-[10px]">
              {Object.entries(ast.domainScores).map(([dom, ds]) => (
                <div key={dom} className="p-1 rounded bg-[#0B1020]/60 border border-white/5">
                  <span className="text-slate-500 uppercase block">{dom.slice(0, 3)}</span>
                  <span
                    className={`font-bold ${
                      ds?.band === 'red'
                        ? 'text-[#EF4444]'
                        : ds?.band === 'amber'
                        ? 'text-[#F59E0B]'
                        : 'text-[#22C55E]'
                    }`}
                  >
                    {ds?.score ?? 85}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
