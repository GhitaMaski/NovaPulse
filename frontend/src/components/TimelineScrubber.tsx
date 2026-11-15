import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Calendar,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const TimelineScrubber: React.FC = () => {
  const {
    currentDay,
    setCurrentDay,
    stepDay,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    simulationData,
    bookmarks,
  } = useSimulationStore();

  const currentDayData = simulationData[currentDay - 1];
  const timerRef = useRef<number | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Interval based on playback speed (1x = 350ms, 2x = 180ms, 5x = 75ms, 10x = 35ms)
    const intervalMs = Math.max(30, Math.round(350 / playbackSpeed));

    timerRef.current = window.setInterval(() => {
      useSimulationStore.getState().stepDay(1);
      // Auto pause at day 200
      if (useSimulationStore.getState().currentDay >= 200) {
        useSimulationStore.getState().setPlaying(false);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const progressPercent = ((currentDay - 1) / 199) * 100;

  return (
    <div className="w-full bg-[#121A2E] border border-[#1F2D4C] rounded-2xl p-4 lg:p-5 shadow-xl transition-all">
      {/* Top row: Day count, date, active phase badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2D4C]/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#0B1020] border border-[#1F2D4C] font-mono font-bold text-white text-base">
            <span className="text-[#2DD4BF] mr-1">Day</span>
            <span>{currentDay.toString().padStart(3, '0')}</span>
            <span className="text-slate-500 font-normal text-xs ml-1.5">/ 200</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDayData?.date ?? '2026-05-16'}</span>
          </div>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden md:inline">Longitudinal Trajectory:</span>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border flex items-center gap-1.5 ${
              currentDayData?.category === 'critical'
                ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                : currentDayData?.category === 'elevated'
                ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                : currentDayData?.category === 'guarded'
                ? 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
                : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
            }`}
          >
            {currentDayData?.category === 'critical' && <Flame className="w-3 h-3 animate-bounce" />}
            <span>{currentDayData?.phaseName}</span>
          </div>
        </div>
      </div>

      {/* Main Scrubber Slider & Timeline Markers */}
      <div className="py-4 relative">
        {/* Timeline Visual Heat Track Background */}
        <div className="relative h-2.5 w-full bg-[#0B1020] rounded-full overflow-hidden border border-[#1F2D4C]/60">
          {/* Phase 1: 1-35 Optimal (green) */}
          <div className="absolute left-0 top-0 bottom-0 w-[17.5%] bg-[#22C55E]/20" />
          {/* Phase 2: 36-65 Viral incursion (amber) */}
          <div className="absolute left-[17.5%] top-0 bottom-0 w-[15%] bg-[#F59E0B]/25" />
          {/* Phase 3: 66-105 Shift drift (blue/amber) */}
          <div className="absolute left-[32.5%] top-0 bottom-0 w-[20%] bg-[#3B82F6]/25" />
          {/* Phase 4: 106-155 Decompensation crisis (red) */}
          <div className="absolute left-[52.5%] top-0 bottom-0 w-[25%] bg-[#EF4444]/35" />
          {/* Phase 5: 156-200 Recovery (teal/green) */}
          <div className="absolute left-[77.5%] top-0 bottom-0 w-[22.5%] bg-[#2DD4BF]/25" />

          {/* Active Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-[#2DD4BF] via-[#3B82F6] to-[#2DD4BF] transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Real Range Input */}
        <input
          type="range"
          min="1"
          max="200"
          value={currentDay}
          onChange={(e) => setCurrentDay(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
          aria-label="Simulation day timeline scrubber slider"
        />

        {/* Milestone Bookmark Markers Overlay */}
        <div className="relative w-full h-4 mt-2 flex justify-between pointer-events-none text-[10px] text-slate-500 font-mono">
          <span>D1</span>
          <span className="hidden sm:inline">D50</span>
          <span>D100</span>
          <span className="hidden sm:inline">D150</span>
          <span>D200</span>

          {/* Render Bookmark Pins */}
          {bookmarks.map((bm) => {
            const leftPct = ((bm.day - 1) / 199) * 100;
            const isSelected = currentDay === bm.day;
            return (
              <button
                key={bm.day}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentDay(bm.day);
                }}
                title={`Jump to Day ${bm.day}: ${bm.label}`}
                className={`pointer-events-auto absolute -top-4 -translate-x-1/2 flex flex-col items-center group transition-transform ${
                  isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                }`}
                style={{ left: `${leftPct}%` }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shadow-md transition-colors ${
                    bm.severity === 'danger'
                      ? 'bg-[#EF4444] border-white'
                      : bm.severity === 'warn'
                      ? 'bg-[#F59E0B] border-white'
                      : bm.severity === 'info'
                      ? 'bg-[#3B82F6] border-white'
                      : 'bg-[#22C55E] border-white'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-white" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Row: Playback buttons, Step controls, Speed presets, Milestone quick jumps */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Playback & Step Transport */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepDay(-10)}
            aria-label="Jump 10 days back"
            className="p-1.5 rounded-lg bg-[#0B1020] text-slate-400 hover:text-white hover:bg-[#1A2540] border border-[#1F2D4C] transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => stepDay(-1)}
            aria-label="Step 1 day back"
            className="p-1.5 rounded-lg bg-[#0B1020] text-slate-400 hover:text-white hover:bg-[#1A2540] border border-[#1F2D4C] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause simulation time-lapse' : 'Play simulation time-lapse'}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-[#F59E0B] text-[#0B1020] hover:bg-[#F59E0B]/90 ring-2 ring-[#F59E0B]/30'
                : 'bg-[#2DD4BF] text-[#0B1020] hover:bg-[#2DD4BF]/90 ring-2 ring-[#2DD4BF]/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play 200D</span>
              </>
            )}
          </button>

          <button
            onClick={() => stepDay(1)}
            aria-label="Step 1 day forward"
            className="p-1.5 rounded-lg bg-[#0B1020] text-slate-400 hover:text-white hover:bg-[#1A2540] border border-[#1F2D4C] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => stepDay(10)}
            aria-label="Jump 10 days forward"
            className="p-1.5 rounded-lg bg-[#0B1020] text-slate-400 hover:text-white hover:bg-[#1A2540] border border-[#1F2D4C] transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center ml-2 bg-[#0B1020] rounded-lg p-0.5 border border-[#1F2D4C] text-[11px] font-mono">
            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Milestone Quick Jumps */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <Bookmark className="w-3 h-3 text-[#2DD4BF]" />
            <span className="hidden xl:inline">Key Milestones:</span>
          </span>
          {bookmarks.map((bm) => (
            <button
              key={bm.day}
              onClick={() => setCurrentDay(bm.day)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all whitespace-nowrap ${
                currentDay === bm.day
                  ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border-[#2DD4BF]/60 shadow-[0_0_8px_rgba(45,212,191,0.25)]'
                  : 'bg-[#0B1020] text-slate-300 border-[#1F2D4C] hover:border-slate-500 hover:text-white'
              }`}
            >
              <span className="font-mono text-slate-400 mr-1">D{bm.day}</span>
              <span>{bm.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
