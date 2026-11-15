// src/layout/TopBar.tsx
import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Zap,
  RotateCcw,
  Maximize2,
  Minimize2,
  Users,
  Flame,
  CloudAlert,
  Moon,
  Clock,
} from 'lucide-react';
import { useMissionStore } from '../stores/useMissionStore';
import { getLastUpdate } from '../lib/selectors';

export const TopBar: React.FC = () => {
  const {
    currentDay,
    setCurrentDay,
    stepDay,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    selectedCrewId,
    setSelectedCrewId,
    activeScenario,
    triggerScenario,
    isMissionControlMode,
    toggleMissionControlMode,
    readings,
    crew,
    dataSource,
    scenarioPrediction,
  } = useMissionStore();

  const playTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.max(30, Math.round(350 / playbackSpeed));
    playTimerRef.current = window.setInterval(() => {
      const nextDay = useMissionStore.getState().currentDay + 1;
      if (nextDay > 200) {
        useMissionStore.getState().setPlaying(false);
      } else {
        useMissionStore.getState().setCurrentDay(nextDay);
      }
    }, intervalMs);

    return () => {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const lastUpdateDate = getLastUpdate(currentDay, readings);
  const sourceLabel = {
    connecting: 'Connecting to mission API',
    backend: 'Mission API · simulated telemetry',
    offline: 'Offline simulation',
    scenario: {
      idle: 'Scenario · simulated telemetry',
      running: 'Scenario · running AI models',
      ready: 'Scenario · AI predictions ready',
      error: 'Scenario · AI unavailable. Select a scenario to retry.',
    }[scenarioPrediction.status],
  }[dataSource];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0B1020]/90 backdrop-blur-md px-4 lg:px-6 py-2.5 transition-colors">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left Section: Mission Clock + Crew Selector + Offline Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mission Day Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121A2E] border border-white/10 font-mono">
            <Clock className="w-4 h-4 text-[#2DD4BF]" />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[#9AA6BF] font-semibold">MISSION</span>
              <span className="text-sm font-black text-white">DAY {currentDay.toString().padStart(3, '0')}</span>
              <span className="text-[10px] text-[#9AA6BF]">/ 200</span>
            </div>
            <span className="text-[10px] text-slate-400 border-l border-white/10 pl-2 hidden sm:inline">
              {lastUpdateDate}
            </span>
          </div>

          {/* Active Astronaut / Crew Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121A2E] border border-white/10 text-xs">
            <Users className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span className="text-[#9AA6BF] hidden md:inline">Focus:</span>
            <select
              aria-label="Select active astronaut focus"
              value={selectedCrewId}
              onChange={(e) => setSelectedCrewId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              {crew.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#121A2E] text-white">
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Offline Autonomous Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121A2E] border border-white/10 text-[11px] ${scenarioPrediction.status === 'error' ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}
            role="status"
          >
            {dataSource === 'offline' || scenarioPrediction.status === 'error'
              ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="font-mono font-medium">{sourceLabel}</span>
          </div>
        </div>

        {/* Center: 200-Day Scrubber Slider + Playback Controls */}
        <div className="flex items-center gap-2 bg-[#121A2E] border border-white/10 rounded-xl px-3 py-1.5 flex-1 max-w-xl">
          <button
            onClick={() => stepDay(-1)}
            aria-label="Step back 1 day"
            className="p-1 rounded text-[#9AA6BF] hover:text-white hover:bg-[#0B1020]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause scrubber' : 'Play 200-day simulation'}
            className="p-1.5 rounded-lg bg-[#2DD4BF] text-[#0B1020] hover:bg-[#2DD4BF]/90 active:scale-95 transition-all font-bold"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => stepDay(1)}
            aria-label="Step forward 1 day"
            className="p-1 rounded text-[#9AA6BF] hover:text-white hover:bg-[#0B1020]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Range Scrubber */}
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="1"
              max="200"
              value={currentDay}
              onChange={(e) => setCurrentDay(Number(e.target.value))}
              aria-label="Scrub 200-day timeline"
              className="w-full accent-[#2DD4BF] cursor-pointer h-1.5 bg-[#0B1020] rounded-lg"
            />
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-0.5 bg-[#0B1020] rounded-lg p-0.5 border border-white/10 text-[10px] font-mono">
            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-[#2DD4BF] text-[#0B1020] font-bold'
                    : 'text-[#9AA6BF] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Scenario Injection Buttons + Mission Control Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#9AA6BF] uppercase tracking-wider hidden 2xl:inline">
            Storylines:
          </span>

          <button
            onClick={() => triggerScenario('radiation')}
            title="Inject Solar Energetic Particle (SEP) storm on Day 48-52"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activeScenario === 'radiation'
                ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                : 'bg-[#121A2E] text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Radiation</span>
          </button>

          <button
            onClick={() => triggerScenario('co2')}
            title="Inject ECLSS cabin CO2 elevation on Day 95-102"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activeScenario === 'co2'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-[#121A2E] text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <CloudAlert className="w-3 h-3" />
            <span>CO2 Rise</span>
          </button>

          <button
            onClick={() => triggerScenario('infection')}
            title="Inject viral pathogen reactivation on Day 135-142"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activeScenario === 'infection'
                ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                : 'bg-[#121A2E] text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Infection</span>
          </button>

          <button
            onClick={() => triggerScenario('sleep')}
            title="Inject acute sleep deficit and operational stress on Day 169-175"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              activeScenario === 'sleep'
                ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                : 'bg-[#121A2E] text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span>Sleep Debt</span>
          </button>

          <button
            onClick={() => triggerScenario('none')}
            title="Return to mission telemetry and reconnect to the local API"
            aria-label="Return to mission telemetry"
            className="p-1.5 rounded-lg bg-[#121A2E] text-[#9AA6BF] hover:text-white border border-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Mission Control Mode Toggle */}
          <button
            onClick={toggleMissionControlMode}
            title={isMissionControlMode ? 'Exit Mission Control View' : 'Fullscreen Mission Control Projection Mode'}
            aria-label="Toggle Mission Control Mode"
            className={`p-1.5 rounded-lg border transition-all ${
              isMissionControlMode
                ? 'bg-[#2DD4BF] text-[#0B1020] border-[#2DD4BF]'
                : 'bg-[#121A2E] text-[#2DD4BF] border-white/10 hover:border-[#2DD4BF]/50'
            }`}
          >
            {isMissionControlMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
