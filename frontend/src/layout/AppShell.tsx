// src/layout/AppShell.tsx
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ExplainDrawer } from '../components/ExplainDrawer';
import { useMissionStore } from '../stores/useMissionStore';
import { Sparkles, X } from 'lucide-react';

export const AppShell: React.FC = () => {
  const {
    isMissionControlMode,
    toastMessage,
    clearToast,
    setSelectedCrewId,
    selectedCrewId,
    crew,
  } = useMissionStore();

  // In Mission Control mode: auto-cycle crew every 12 seconds for demo projection
  useEffect(() => {
    if (!isMissionControlMode) return;
    const interval = window.setInterval(() => {
      const idx = crew.findIndex((c) => c.id === selectedCrewId);
      const nextIdx = (idx + 1) % crew.length;
      setSelectedCrewId(crew[nextIdx].id);
    }, 12000);
    return () => window.clearInterval(interval);
  }, [crew, isMissionControlMode, selectedCrewId, setSelectedCrewId]);

  return (
    <div
      className={`min-h-screen bg-[#0B1020] text-[#E6EAF2] space-backdrop flex flex-col font-sans transition-all ${
        isMissionControlMode ? 'p-2 md:p-4' : ''
      }`}
    >
      {/* Top Bar */}
      <TopBar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Routed Content Area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-[1920px] mx-auto w-full focus:outline-none"
        >
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 flex items-center justify-between p-3.5 rounded-xl bg-[#121A2E]/90 border border-[#2DD4BF]/40 text-xs text-white shadow-[0_0_20px_rgba(45,212,191,0.2)] animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2DD4BF] animate-spin" />
                <span className="font-semibold">{toastMessage}</span>
              </div>
              <button
                onClick={clearToast}
                aria-label="Dismiss toast"
                className="p-1 rounded text-[#9AA6BF] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Child Page Content */}
          <Outlet />
        </main>
      </div>

      {/* AI Explanation Drawer Modal */}
      <ExplainDrawer />
    </div>
  );
};
