// src/screens/AnomalyDetectionScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useMissionStore } from '../stores/useMissionStore';
import { getAnomalies } from '../lib/selectors';
import { loadAnomalyScores } from '../lib/dataSource';
import { predictionKey } from '../lib/predictions';
import type { AnomalyScore } from '../shared/types';
import { StatusPill } from '../components/StatusPill';
import { Binary, ArrowUpDown, ShieldCheck } from 'lucide-react';

export const AnomalyDetectionScreen: React.FC = () => {
  const { currentDay, result, readings, crew, dataSource, scenarioPrediction } = useMissionStore();
  const predictions = scenarioPrediction.results;
  const [modelScores, setModelScores] = useState<AnomalyScore[] | 'unavailable' | null>(null);

  const [severityFilter, setSeverityFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [sortBy, setSortBy] = useState<'z' | 'confidence' | 'day'>('z');

  useEffect(() => {
    setModelScores(null);
    if (dataSource !== 'backend') return;
    let current = true;
    void loadAnomalyScores(crew)
      .then((scores) => { if (current) setModelScores(scores); })
      .catch(() => { if (current) setModelScores('unavailable'); });
    return () => { current = false; };
  }, [crew, dataSource, readings]);

  const rawAnomalies = useMemo(() => {
    return getAnomalies(currentDay, result.scores, readings, crew);
  }, [currentDay, result.scores, readings, crew]);

  const filtered = useMemo(() => {
    return rawAnomalies
      .filter((a) => {
        if (severityFilter !== 'all' && a.severityLabel !== severityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'z') return Math.abs(b.z) - Math.abs(a.z);
        if (sortBy === 'confidence') return b.confidencePct - a.confidencePct;
        return b.day - a.day;
      });
  }, [rawAnomalies, severityFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Binary className="w-5 h-5 text-[#F59E0B]" />
            Autonomous Anomaly Detection Engine
          </h1>
          <p className="text-xs text-[#9AA6BF]">
            Multi-variate statistical deviation surveillance (|z| ≥ 2.0) on Day {currentDay}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity filter */}
          <div className="flex items-center gap-1 bg-[#121A2E] rounded-xl p-1 border border-white/10 text-xs">
            {(['all', 'High', 'Medium', 'Low'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  severityFilter === sev
                    ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                    : 'text-[#9AA6BF] hover:text-white'
                }`}
              >
                {sev === 'all' ? 'All' : sev}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-[#121A2E] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <select
              aria-label="Sort anomalies"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'z' | 'confidence' | 'day')}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="z" className="bg-[#121A2E] text-white">Sort by |z-score|</option>
              <option value="confidence" className="bg-[#121A2E] text-white">Sort by Confidence</option>
              <option value="day" className="bg-[#121A2E] text-white">Sort by Day</option>
            </select>
          </div>
        </div>
      </div>

      {dataSource === 'backend' && (
        <section className="glass-panel rounded-2xl p-4 space-y-3" aria-labelledby="model-anomalies">
          <h2 id="model-anomalies" className="text-sm font-bold">Isolation Forest · Day {currentDay}</h2>
          {modelScores === null && <p role="status" className="text-xs text-slate-400">Loading model scores…</p>}
          {modelScores === 'unavailable' && <p className="text-xs text-slate-400">API model scores are unavailable.</p>}
          {Array.isArray(modelScores) && (
            <ul className="grid sm:grid-cols-3 gap-3" aria-label="Isolation Forest scores">
              {modelScores.filter((score) => score.day === currentDay).map((score) => (
                <li key={score.crewId} className="rounded-xl border border-white/10 p-3 text-xs space-y-1">
                  <p className="font-semibold">{crew.find(({ id }) => id === score.crewId)?.name ?? score.crewId}</p>
                  <p className={score.isAnomaly ? 'text-[#F59E0B]' : 'text-slate-400'}>
                    {score.anomalyScore.toFixed(1)} / 100 · {score.isAnomaly ? 'Anomaly flagged' : 'Within model range'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {predictions && (
        <section className="glass-panel rounded-2xl p-4 space-y-3" aria-labelledby="scenario-model-anomalies">
          <h2 id="scenario-model-anomalies" className="text-sm font-bold">Trained Isolation Forest · Day {currentDay}</h2>
          <ul className="grid sm:grid-cols-3 gap-3">
            {crew.map(({ id, name }) => {
              const prediction = predictions[predictionKey(id, currentDay)];
              return (
                <li key={id} className="rounded-xl border border-white/10 p-3 text-xs space-y-1">
                  <p className="font-semibold">{name}</p>
                  <p className={prediction?.anomaly === 'Anomaly Detected' ? 'text-[#F59E0B]' : 'text-slate-400'}>
                    {prediction?.anomaly ?? 'No prediction available'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Anomalies Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between text-xs text-[#9AA6BF]">
          <span>Detected Anomalies: <strong className="text-white">{filtered.length}</strong></span>
          <span className="font-mono text-[11px] text-[#2DD4BF]">Baseline comparison</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#9AA6BF] space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-[#22C55E]" />
            <p className="text-sm font-semibold text-white">All Biosentry Telemetry Within Normal Variance</p>
            <p className="text-xs text-slate-400">
              No physiological biomarker is currently deviating by |z| ≥ 2.0 on Day {currentDay}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Anomaly Detection Table">
              <thead className="bg-[#0B1020]/80 text-[#9AA6BF] uppercase tracking-wider text-[10px] font-mono border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Anomaly Type</th>
                  <th className="py-3 px-4">Astronaut</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">z-score</th>
                  <th className="py-3 px-4">Delta %</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Date / Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      {a.typeTitle}
                      <span className="block text-[10px] font-mono text-[#9AA6BF] font-normal">
                        {a.indicator}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[#2DD4BF] font-bold">{a.crewId}</span>
                      <span className="block text-[10px] text-slate-400 font-sans">{a.crewName.split(' ')[0]}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <StatusPill severity={a.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className={Math.abs(a.z) >= 3 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}>
                        {a.z > 0 ? `+${a.z.toFixed(2)}` : a.z.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={a.deltaPct >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}>
                        {a.deltaPct >= 0 ? `+${a.deltaPct.toFixed(1)}%` : `${a.deltaPct.toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {a.confidencePct}%
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      Day {a.day} • {a.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
