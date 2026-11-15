import React from 'react';
import {
  Activity,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  User,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const Header: React.FC = () => {
  const {
    activeProfile,
    availableProfiles,
    selectProfile,
    openCheckInModal,
    openExportModal,
    openAlertDrawer,
    activeAlert,
    currentDay,
    simulationData,
  } = useSimulationStore();

  const currentDayData = simulationData[currentDay - 1];
  const hasUnacknowledgedAlert = activeAlert && !activeAlert.acknowledged;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#1F2D4C] bg-[#0B1020]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#2DD4BF]/20 via-[#121A2E] to-[#3B82F6]/20 border border-[#2DD4BF]/40 shadow-[0_0_15px_rgba(45,212,191,0.25)]">
            <Activity className="w-5 h-5 text-[#2DD4BF] animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#0B1020]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                NovaPulse
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                v2.4 Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Longitudinal Physiological Risk & 200-Day Time-Lapse Attribution
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Patient Profile Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121A2E] border border-[#1F2D4C] text-xs">
            <User className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span className="text-slate-400 hidden sm:inline">Subject:</span>
            <select
              aria-label="Select subject profile"
              value={activeProfile.id}
              onChange={(e) => selectProfile(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121A2E] text-white">
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Offline Dexie Persistence Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121A2E] border border-[#1F2D4C] text-[11px] text-slate-300"
            title="Local IndexedDB storage enabled with zero runtime external calls"
          >
            <Database className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="font-mono text-slate-300">Dexie Sync: OK</span>
          </div>

          {/* Active Alert Trigger Button */}
          {activeAlert && (
            <button
              onClick={() => openAlertDrawer(activeAlert)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                hasUnacknowledgedAlert
                  ? activeAlert.severity === 'critical'
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 animate-pulse hover:bg-[#EF4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 hover:bg-[#F59E0B]/30'
                  : 'bg-[#121A2E] text-slate-300 border-[#1F2D4C] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {hasUnacknowledgedAlert ? 'Explain Alert' : 'View Alert Attribution'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
            </button>
          )}

          {/* Interactive Reaction Check-in Button */}
          <button
            onClick={openCheckInModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2DD4BF] text-[#0B1020] text-xs font-semibold hover:bg-[#2DD4BF]/90 active:scale-95 transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)]"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Reaction Check-in</span>
          </button>

          {/* Clinical Export Report */}
          <button
            onClick={openExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121A2E] text-slate-300 hover:text-white border border-[#1F2D4C] hover:border-[#2DD4BF]/40 text-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
