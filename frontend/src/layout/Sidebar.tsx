// src/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  LineChart,
  Binary,
  TrendingUp,
  Sparkles,
  BarChart3,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
} from 'lucide-react';
import { useMissionStore } from '../stores/useMissionStore';

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, selectedCrewId, result, currentDay } =
    useMissionStore();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/crew', label: 'Crew List', icon: Users },
    { to: `/crew/${selectedCrewId}`, label: 'Astronaut Detail', icon: User },
    { to: '/history', label: 'Data History', icon: LineChart },
    { to: '/anomalies', label: 'Anomalies', icon: Binary },
    { to: '/risk', label: 'Risk Prediction', icon: TrendingUp },
    { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
    { to: '/analysis', label: 'Crew Analysis', icon: BarChart3 },
    { to: '/alerts', label: 'Alerts', icon: Bell },
  ];

  // Count active open alerts around current day
  const activeAlertsCount = result.alerts.filter((a) => a.day === currentDay && a.status === 'open').length;

  return (
    <aside
      className={`relative z-20 border-r border-white/10 bg-[#0B1020]/95 backdrop-blur-md transition-all duration-300 flex flex-col justify-between shrink-0 ${
        isSidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top brand */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-14">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#2DD4BF]/20 border border-[#2DD4BF]/40 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#2DD4BF]" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-wider font-mono">
                  NOVAPULSE
                </span>
                <span className="text-[9px] text-[#9AA6BF] tracking-widest uppercase">
                  NASA Space Apps '26
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-lg text-[#9AA6BF] hover:text-white hover:bg-[#121A2E] transition-colors"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30 font-bold shadow-[0_0_12px_rgba(45,212,191,0.15)]'
                    : 'text-[#9AA6BF] hover:text-[#E6EAF2] hover:bg-[#121A2E]'
                }`
              }
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              {!isSidebarCollapsed && item.label === 'Alerts' && activeAlertsCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EF4444] text-white">
                  {activeAlertsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom mission badge */}
      {!isSidebarCollapsed && (
        <div className="p-3 m-2 rounded-xl bg-[#121A2E] border border-white/10 text-[11px] text-[#9AA6BF]">
          <div className="font-semibold text-white">Autonomous Biosentry</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Deep Space Transit Module</div>
        </div>
      )}
    </aside>
  );
};
