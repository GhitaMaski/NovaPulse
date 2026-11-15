import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  CheckCircle,
  Copy,
  Printer,
  Calendar,
  User,
  Shield,
  Activity,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export const ExportSummaryModal: React.FC = () => {
  const {
    isExportModalOpen,
    closeExportModal,
    activeProfile,
    currentDay,
    simulationData,
    checkInHistory,
  } = useSimulationStore();

  const [copied, setCopied] = useState<boolean>(false);
  const currentDayData = simulationData[currentDay - 1];

  if (!isExportModalOpen || !currentDayData) return null;

  const clinicalSummaryText = `NOVAPULSE PHYSIOLOGICAL ASSESSMENT REPORT
Generated: ${new Date().toISOString()}
Subject: ${activeProfile.name} (Code: ${activeProfile.code})
Age: ${activeProfile.age} | Gender: ${activeProfile.gender}
Condition: ${activeProfile.condition}
Current Timeline Point: Day ${currentDay} of 200 (${currentDayData.date})
Active Phase: ${currentDayData.phaseName}

COMPOSITE STATUS:
- Allostatic Risk Index: ${currentDayData.compositeRiskScore} / 100 (${currentDayData.category.toUpperCase()})
- Autonomic Tone (Cardiovascular): ${currentDayData.domainScores.cardiovascular.score}/100 (HRV: ${currentDayData.biomarkers.hrv.value.toFixed(1)} ms, RHR: ${currentDayData.biomarkers.rhr.value.toFixed(1)} bpm)
- Metabolic & Glycemic Stability: ${currentDayData.domainScores.metabolic.score}/100 (Glucose: ${currentDayData.biomarkers.glucose.value.toFixed(1)} mg/dL)
- Neuro-Cognitive & Sleep Architecture: ${currentDayData.domainScores.neurocognitive.score}/100 (Deep Sleep: ${currentDayData.biomarkers.deepSleep.value.toFixed(1)}%)
- Respiratory & Gas Dynamics: ${currentDayData.domainScores.respiratory.score}/100 (SpO2: ${currentDayData.biomarkers.spo2.value.toFixed(1)}%)
- Systemic Immune & Cytokine Load: ${currentDayData.domainScores.immune.score}/100 (hs-CRP: ${currentDayData.biomarkers.crp.value.toFixed(2)} mg/L, Temp Dev: ${currentDayData.biomarkers.tempDev.value.toFixed(2)}°C)

ACTIVE ALERTS:
${
  currentDayData.activeAlert
    ? `Title: ${currentDayData.activeAlert.title}
Severity: ${currentDayData.activeAlert.severity.toUpperCase()}
Mechanism: ${currentDayData.activeAlert.physiologicalMechanism}
Contributors: ${currentDayData.activeAlert.contributors.map(c => `${c.biomarkerName} (+${c.contributionPercent}%)`).join(', ')}`
    : 'No active clinical alerts on this timeline date.'
}

SUBJECTIVE CHECK-INS:
${checkInHistory.length} check-in entries logged in local Dexie IndexedDB.
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clinicalSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataToExport = {
      profile: activeProfile,
      currentDay,
      daySnapshot: currentDayData,
      checkInHistory,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NovaPulse_${activeProfile.code}_Day${currentDay}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        onClick={closeExportModal}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="relative z-10 w-full max-w-2xl bg-[#0B1020] border border-[#1F2D4C] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-[#1F2D4C] bg-[#121A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-bold text-white">
                Clinical Summary Report
              </h2>
              <p className="text-xs text-slate-400">
                Generate offline clinical briefing & export telemetry JSON
              </p>
            </div>
          </div>

          <button
            onClick={closeExportModal}
            aria-label="Close export modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2540] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Formatted Text Box */}
          <div className="p-4 rounded-xl bg-[#070A14] border border-[#1F2D4C] font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
            {clinicalSummaryText}
          </div>
        </div>

        <div className="p-4 border-t border-[#1F2D4C] bg-[#121A2E] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B1020] text-slate-200 hover:text-white border border-[#1F2D4C] text-xs font-semibold transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2DD4BF] text-[#0B1020] text-xs font-bold hover:bg-[#2DD4BF]/90 transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)]"
            >
              <Download className="w-4 h-4" />
              <span>Download Full JSON</span>
            </button>
            <button
              onClick={closeExportModal}
              className="px-4 py-2 rounded-xl bg-[#1A2540] text-slate-300 hover:text-white text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
