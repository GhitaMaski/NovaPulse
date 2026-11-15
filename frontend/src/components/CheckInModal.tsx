import React, { useState } from 'react';
import {
  X,
  ClipboardCheck,
  Smile,
  Meh,
  Frown,
  CheckCircle,
  History,
  Scale,
  Brain,
  Heart,
  Save,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSimulationStore } from '../store/useSimulationStore';
import type { SubjectiveCheckIn } from '../types';

export const CheckInModal: React.FC = () => {
  const {
    isCheckInModalOpen,
    closeCheckInModal,
    currentDay,
    activeProfile,
    simulationData,
    submitCheckIn,
    checkInHistory,
  } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Form State
  const [fatigue, setFatigue] = useState<number>(7);
  const [fog, setFog] = useState<number>(6);
  const [palpitations, setPalpitations] = useState<number>(6);
  const [breath, setBreath] = useState<number>(4);
  const [soreness, setSoreness] = useState<number>(5);
  const [stress, setStress] = useState<number>(8);
  const [mood, setMood] = useState<SubjectiveCheckIn['moodRating']>('low');
  const [adherence, setAdherence] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Noticing pronounced morning exhaustion and elevated pulse on standing.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isCheckInModalOpen) return null;

  const currentDayData = simulationData[currentDay - 1];

  // Live concordance calculation preview
  const subjectiveAggregate =
    ((fatigue + fog + palpitations + breath + soreness + stress) / 60) * 100;
  const objectiveScore = currentDayData?.compositeRiskScore ?? 50;
  const delta = subjectiveAggregate - objectiveScore;
  const concordanceScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(delta))));

  let concordanceLabel: SubjectiveCheckIn['concordanceLabel'] = 'High Agreement';
  if (Math.abs(delta) <= 18) {
    concordanceLabel = 'High Agreement';
  } else if (Math.abs(delta) <= 32) {
    concordanceLabel = 'Moderate Discordance';
  } else if (delta > 32) {
    concordanceLabel = 'Subjective Over-Reporting';
  } else {
    concordanceLabel = 'Subjective Under-Reporting';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitCheckIn({
        day: currentDay,
        timestamp: new Date().toISOString(),
        patientId: activeProfile.id,
        fatigueLevel: fatigue,
        cognitiveFog: fog,
        palpitations,
        shortnessOfBreath: breath,
        muscleSoreness: soreness,
        perceivedStress: stress,
        moodRating: mood,
        protocolAdherence: adherence,
        freeformNotes: notes,
      });

      // Trigger celebratory confetti for successfully logging clinical reaction
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2DD4BF', '#3B82F6', '#22C55E'],
        });
      } catch {
        // Safe fallback
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeCheckInModal}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        className="relative z-10 w-full max-w-2xl bg-[#0B1020] border border-[#1F2D4C] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1F2D4C] bg-[#121A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="checkin-title" className="text-base font-bold text-white flex items-center gap-2">
                Interactive Reaction Check-in
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-[#0B1020] text-[#2DD4BF] border border-[#1F2D4C]">
                  Day {currentDay}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Subjective physiological symptom calibration & objective concordance analysis
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckInModal}
            aria-label="Close check-in modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2540] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Form vs History */}
        <div className="flex border-b border-[#1F2D4C] bg-[#0B1020] px-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'form'
                ? 'border-[#2DD4BF] text-[#2DD4BF] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Record Day {currentDay} Reaction</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#2DD4BF] text-[#2DD4BF] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Dexie Check-in Logs ({checkInHistory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Live Concordance Analyzer Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#121A2E] to-[#152038] border border-[#1F2D4C] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Real-Time Model Concordance
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                      concordanceLabel === 'High Agreement'
                        ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                        : concordanceLabel === 'Moderate Discordance'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                        : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/40'
                    }`}
                  >
                    {concordanceScore}% • {concordanceLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                  <div className="p-2.5 rounded-lg bg-[#0B1020] border border-[#1F2D4C]">
                    <div className="text-slate-400 text-[10px]">Subjective Strain Burden</div>
                    <div className="text-base font-bold text-white">
                      {Math.round(subjectiveAggregate)}/100
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1020] border border-[#1F2D4C]">
                    <div className="text-slate-400 text-[10px]">Objective Model Risk</div>
                    <div className="text-base font-bold text-[#2DD4BF]">
                      {objectiveScore}/100
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {concordanceLabel === 'High Agreement'
                    ? 'Patient subjective feedback strongly reinforces algorithmic autonomic and metabolic sensor vectors.'
                    : concordanceLabel === 'Subjective Over-Reporting'
                    ? 'Perceived symptoms exceed physiological sensor indicators; evaluate psycho-emotional stressors or prodromal sensitivity.'
                    : 'Objective sensors indicate higher strain than perceived; risk of silent over-exertion.'}
                </p>
              </div>

              {/* Symptom Sliders Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Symptom Burden Scale (1 = Absent, 10 = Severe)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fatigue */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="fatigue-slider" className="font-medium text-white">General Fatigue</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{fatigue}/10</span>
                    </div>
                    <input
                      id="fatigue-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={fatigue}
                      onChange={(e) => setFatigue(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>

                  {/* Cognitive Fog */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="fog-slider" className="font-medium text-white">Cognitive / Mental Fog</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{fog}/10</span>
                    </div>
                    <input
                      id="fog-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={fog}
                      onChange={(e) => setFog(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>

                  {/* Palpitations */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="palp-slider" className="font-medium text-white">Orthostatic Palpitations</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{palpitations}/10</span>
                    </div>
                    <input
                      id="palp-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={palpitations}
                      onChange={(e) => setPalpitations(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>

                  {/* Shortness of Breath */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="breath-slider" className="font-medium text-white">Exertional Dyspnea</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{breath}/10</span>
                    </div>
                    <input
                      id="breath-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={breath}
                      onChange={(e) => setBreath(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>

                  {/* Muscle Soreness */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="soreness-slider" className="font-medium text-white">Myalgia / Muscle Aches</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{soreness}/10</span>
                    </div>
                    <input
                      id="soreness-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={soreness}
                      onChange={(e) => setSoreness(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>

                  {/* Perceived Stress */}
                  <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="stress-slider" className="font-medium text-white">Perceived Allostatic Stress</label>
                      <span className="font-mono font-bold text-[#2DD4BF]">{stress}/10</span>
                    </div>
                    <input
                      id="stress-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={stress}
                      onChange={(e) => setStress(Number(e.target.value))}
                      className="w-full accent-[#2DD4BF] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Mood and Adherence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-2">
                  <label className="text-xs font-bold text-white block">Mood / Affect State</label>
                  <div className="grid grid-cols-5 gap-1 text-[11px] font-medium">
                    {(
                      [
                        { key: 'very_low', label: 'Very Low' },
                        { key: 'low', label: 'Low' },
                        { key: 'neutral', label: 'Neutral' },
                        { key: 'good', label: 'Good' },
                        { key: 'optimal', label: 'Optimal' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMood(m.key)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          mood === m.key
                            ? 'bg-[#2DD4BF] text-[#0B1020] font-bold border-[#2DD4BF]'
                            : 'bg-[#0B1020] text-slate-300 border-[#1F2D4C] hover:border-slate-500'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] flex flex-col justify-center">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={adherence}
                      onChange={(e) => setAdherence(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2DD4BF] focus:ring-[#2DD4BF] accent-[#2DD4BF]"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Adhered to Recovery Protocol
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Followed sleep timing, hydration & low-load protocol
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="space-y-1.5">
                <label htmlFor="notes-area" className="text-xs font-bold text-white block">
                  Subjective Observations & Contextual Triggers
                </label>
                <textarea
                  id="notes-area"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note meals, sleep interruptions, travel, or perceived symptoms..."
                  className="w-full p-3 rounded-xl bg-[#121A2E] border border-[#1F2D4C] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2DD4BF]"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCheckInModal}
                  className="px-4 py-2.5 rounded-xl bg-[#121A2E] text-slate-300 hover:text-white border border-[#1F2D4C] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                >
                  <Save className="w-4 h-4" />
                  <span>Commit Check-in to Dexie DB</span>
                </button>
              </div>
            </form>
          ) : (
            /* History Log Tab */
            <div className="space-y-3">
              {checkInHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <ClipboardCheck className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm">No check-ins recorded yet in Dexie.</p>
                  <p className="text-xs text-slate-500">
                    Switch to the record tab to log the current day reaction.
                  </p>
                </div>
              ) : (
                checkInHistory.map((item, idx) => (
                  <div
                    key={item.id ?? idx}
                    className="p-4 rounded-xl bg-[#121A2E] border border-[#1F2D4C] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-[#2DD4BF]">Day {item.day}</span>
                        <span className="text-slate-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40 font-mono">
                        {item.concordanceScore}% Concordance ({item.concordanceLabel})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px] font-mono pt-1">
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Fatigue</span>
                        <span className="text-white font-bold">{item.fatigueLevel}/10</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Brain Fog</span>
                        <span className="text-white font-bold">{item.cognitiveFog}/10</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Palpitations</span>
                        <span className="text-white font-bold">{item.palpitations}/10</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Dyspnea</span>
                        <span className="text-white font-bold">{item.shortnessOfBreath}/10</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Myalgia</span>
                        <span className="text-white font-bold">{item.muscleSoreness}/10</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1020] border border-[#1F2D4C]">
                        <span className="text-slate-500 block">Stress</span>
                        <span className="text-white font-bold">{item.perceivedStress}/10</span>
                      </div>
                    </div>

                    {item.freeformNotes && (
                      <p className="text-xs text-slate-300 italic pt-1">
                        "{item.freeformNotes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
