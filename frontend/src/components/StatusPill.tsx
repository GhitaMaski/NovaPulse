// src/components/StatusPill.tsx
import React from 'react';
import { CheckCircle2, AlertTriangle, OctagonAlert, Info } from 'lucide-react';
import type { Band, Severity } from '../shared/types';

interface StatusPillProps {
  band?: Band;
  severity?: Severity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  band,
  severity,
  size = 'md',
  className = '',
}) => {
  // Map band or severity to standard presentation
  let colorClass = 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30';
  let label = 'Healthy';
  let Icon = CheckCircle2;

  if (band === 'red' || severity === 'critical') {
    colorClass = 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40 animate-pulse';
    label = 'Critical';
    Icon = OctagonAlert;
  } else if (band === 'amber' || severity === 'warning' || severity === 'watch') {
    colorClass = 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    label = 'Warning';
    Icon = AlertTriangle;
  } else if (severity === 'info') {
    colorClass = 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30';
    label = 'Info';
    Icon = Info;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs gap-2'
      : 'px-2.5 py-1 text-[11px] gap-1.5';

  const iconSizes = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-full border ${colorClass} ${sizeClasses} ${className}`}
    >
      <Icon className={`${iconSizes} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};
