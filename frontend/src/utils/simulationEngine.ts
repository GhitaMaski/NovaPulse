import type {
  DaySimulationData,
  DomainRiskScore,
  BiomarkerReading,
  PhysiologicalDomainKey,
  PatientProfile,
  TimelineBookmark,
  SubjectiveCheckIn,
} from '../types';
import { getRiskCategory, generateAlertForDay } from './attributionEngine';

export const DEFAULT_PROFILES: PatientProfile[] = [
  {
    id: 'P-101',
    name: 'Elena Vance',
    code: 'EV-8842',
    age: 34,
    gender: 'Female',
    condition: 'Endurance Athlete (Allostatic Overreaching & Sympathetic Strain)',
    baselineRestingHR: 48,
    baselineHRV: 68,
    scenarioDescription:
      'Longitudinal progression from baseline peak conditioning through high-volume training overload, subsequent autonomic decompensation around Day 135, and structured phase recovery protocol.',
  },
  {
    id: 'P-204',
    name: 'Marcus Chen',
    code: 'MC-3190',
    age: 46,
    gender: 'Male',
    condition: 'Commercial Aviator (Circadian Desynchrony & Metabolic Drift)',
    baselineRestingHR: 62,
    baselineHRV: 44,
    scenarioDescription:
      'Multi-timezone transmeridian flight schedules causing circadian misalignment, progressive glycemic volatility, elevated nocturnal cortisol, and secondary metabolic strain.',
  },
  {
    id: 'P-318',
    name: 'Dr. Sarah Lin',
    code: 'SL-7412',
    age: 39,
    gender: 'Female',
    condition: 'Critical Care Physician (Post-Viral Autonomic Instability)',
    baselineRestingHR: 56,
    baselineHRV: 52,
    scenarioDescription:
      'Onset of mild respiratory viral illness at Day 42 leading to persistent post-viral orthostatic tachycardia, deep sleep fragmentation, and elevated systemic cytokine markers.',
  },
];

export const DEFAULT_BOOKMARKS: TimelineBookmark[] = [
  {
    day: 12,
    label: 'Optimal Baseline',
    phase: 'Phase 1: Baseline Homeostasis',
    severity: 'ok',
    description: 'Stabilized circadian rhythm, high parasympathetic tone (HRV 72ms), optimal glycemic clearance.',
  },
  {
    day: 44,
    label: 'Viral Exposure Surge',
    phase: 'Phase 2: Acute Immune Challenge',
    severity: 'warn',
    description: 'Sudden nocturnal temperature elevation (+0.82°C) and acute reduction in recovery readiness.',
  },
  {
    day: 86,
    label: 'Circadian Desynchrony',
    phase: 'Phase 3: Circadian & Metabolic Shift',
    severity: 'info',
    description: 'Severe deep sleep deficit (7.8%) and postprandial glucose volatility following schedule disruption.',
  },
  {
    day: 136,
    label: 'Autonomic Decompensation',
    phase: 'Phase 4: Multi-System Exhaustion',
    severity: 'danger',
    description: 'Peak sympathetic overdrive: HRV plummets to 21ms, resting HR elevates +18 bpm, critical alert triggered.',
  },
  {
    day: 182,
    label: 'Structured Protocol Recovery',
    phase: 'Phase 5: Regenerative Precision Protocol',
    severity: 'ok',
    description: 'Consistent sleep architecture rebound, inflammatory normalization, autonomic tone restored.',
  },
];

// Seeded pseudorandom generator for reproducible, smooth biological variations
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Generate the 200 days simulation
export function generate200DaySimulation(profile: PatientProfile = DEFAULT_PROFILES[0]): DaySimulationData[] {
  const startDate = new Date(2026, 0, 1); // Jan 1, 2026
  const simulation: DaySimulationData[] = [];

  for (let day = 1; day <= 200; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + (day - 1));
    const dateStr = currentDate.toISOString().split('T')[0];

    // Physiological Phase curve modeling:
    // Phase 1 (1-35): Baseline (risk ~ 12-22)
    // Phase 2 (36-65): Viral incursion & acute immune spike (peak around day 44, risk up to 68)
    // Phase 3 (66-105): Metabolic & circadian drift (risk ~ 38-55)
    // Phase 4 (106-155): Decompensation crisis (peak around day 136, risk up to 86)
    // Phase 5 (156-200): Clinical recovery & rebound (risk dropping to 14-24)

    let phaseName = 'Phase 1: Baseline Homeostasis';
    let phaseSeverityBias = 0;
    let cvBias = 0;
    let metBias = 0;
    let neuroBias = 0;
    let respBias = 0;
    let immBias = 0;

    if (day <= 35) {
      phaseName = 'Phase 1: Baseline Homeostasis';
      phaseSeverityBias = 14 + Math.sin(day / 6) * 4;
      cvBias = 12;
      metBias = 15;
      neuroBias = 14;
      respBias = 10;
      immBias = 12;
    } else if (day <= 65) {
      phaseName = 'Phase 2: Acute Immune Challenge';
      const peakDist = Math.abs(day - 44);
      const immuneSpike = Math.max(0, 58 - peakDist * 3.4);
      phaseSeverityBias = 32 + immuneSpike;
      cvBias = 24 + immuneSpike * 0.4;
      metBias = 22 + immuneSpike * 0.3;
      neuroBias = 28 + immuneSpike * 0.5;
      respBias = 20 + immuneSpike * 0.6;
      immBias = 30 + immuneSpike * 1.1;
    } else if (day <= 105) {
      phaseName = 'Phase 3: Circadian & Metabolic Shift';
      const wave = Math.sin((day - 65) / 7) * 8;
      phaseSeverityBias = 38 + wave;
      cvBias = 34 + wave * 0.6;
      metBias = 48 + wave * 0.9;
      neuroBias = 46 + wave * 0.8;
      respBias = 26 + wave * 0.4;
      immBias = 28 + wave * 0.5;
    } else if (day <= 155) {
      phaseName = 'Phase 4: Multi-System Exhaustion';
      const peakDist = Math.abs(day - 136);
      const crisisPeak = Math.max(0, 48 - peakDist * 2.2);
      phaseSeverityBias = 42 + crisisPeak;
      cvBias = 46 + crisisPeak * 0.95;
      metBias = 42 + crisisPeak * 0.7;
      neuroBias = 45 + crisisPeak * 0.85;
      respBias = 38 + crisisPeak * 0.6;
      immBias = 40 + crisisPeak * 0.75;
    } else {
      phaseName = 'Phase 5: Regenerative Precision Protocol';
      const recoveryProgress = (day - 155) / 45; // 0 to 1
      phaseSeverityBias = 35 * (1 - recoveryProgress) + 14;
      cvBias = 38 * (1 - recoveryProgress) + 12;
      metBias = 34 * (1 - recoveryProgress) + 15;
      neuroBias = 40 * (1 - recoveryProgress) + 13;
      respBias = 28 * (1 - recoveryProgress) + 11;
      immBias = 32 * (1 - recoveryProgress) + 12;
    }

    // Add deterministic micro-variations
    const noise = (pseudoRandom(day * 13 + 7) - 0.5) * 6;
    const dayNoise1 = (pseudoRandom(day * 17 + 1) - 0.5) * 5;
    const dayNoise2 = (pseudoRandom(day * 19 + 3) - 0.5) * 5;
    const dayNoise3 = (pseudoRandom(day * 23 + 5) - 0.5) * 5;
    const dayNoise4 = (pseudoRandom(day * 29 + 9) - 0.5) * 5;

    // Biomarkers Generation
    // Cardiovascular
    const hrvDropFactor = cvBias / 100;
    const hrvVal = clamp(
      profile.baselineHRV * (1.1 - hrvDropFactor * 0.65) + dayNoise1,
      14,
      115
    );
    const rhrVal = clamp(
      profile.baselineRestingHR + (cvBias * 0.28) + dayNoise2 * 0.5,
      42,
      98
    );
    const sbpVal = clamp(118 + cvBias * 0.24 + dayNoise3 * 0.4, 105, 162);
    const orthoDeltaVal = clamp(10 + cvBias * 0.25 + dayNoise4 * 0.3, 6, 38);

    // Metabolic
    const glucoseVal = clamp(86 + metBias * 0.55 + dayNoise1 * 0.8, 70, 185);
    const postprandialVal = clamp(118 + metBias * 0.85 + dayNoise2 * 1.2, 95, 230);
    const glycemicCVVal = clamp(12 + metBias * 0.28 + dayNoise3 * 0.3, 8, 36);
    const lactateSurrogate = clamp(1.0 + metBias * 0.02 + dayNoise4 * 0.03, 0.6, 3.4);

    // Neurocognitive
    const deepSleepVal = clamp(22 - neuroBias * 0.18 + dayNoise1 * 0.4, 4.5, 28);
    const remFragmentationVal = clamp(1.6 + neuroBias * 0.05 + dayNoise2 * 0.08, 0.8, 7.2);
    const sleepEfficiencyVal = clamp(94 - neuroBias * 0.28 + dayNoise3 * 0.5, 62, 98);
    const cogLatencyVal = clamp(255 + neuroBias * 1.1 + dayNoise4 * 1.5, 230, 390);

    // Respiratory
    const spo2Val = clamp(98.2 - respBias * 0.065 + dayNoise1 * 0.15, 89.5, 99.5);
    const spo2DipsVal = Math.round(clamp(1.5 + respBias * 0.18 + dayNoise2 * 0.3, 0, 18));
    const respRateVal = clamp(13.2 + respBias * 0.055 + dayNoise3 * 0.1, 11, 21.5);
    const aerobicReserveVal = clamp(13.5 - respBias * 0.07 + dayNoise4 * 0.1, 7.5, 15.5);

    // Immune
    const crpVal = clamp(0.5 + immBias * 0.065 + dayNoise1 * 0.08, 0.2, 7.5);
    const tempDevVal = clamp(-0.15 + (immBias * 0.018) + (dayNoise2 * 0.03), -0.6, 1.45);
    const recoveryScoreVal = clamp(92 - immBias * 0.75 + dayNoise3 * 0.8, 18, 98);
    const leukocyteProxy = clamp(4.6 + immBias * 0.045 + dayNoise4 * 0.06, 3.8, 9.8);

    // Build Biomarker objects with zScores
    const biomarkers: Record<string, BiomarkerReading> = {
      hrv: {
        id: 'hrv',
        name: 'Heart Rate Variability (rMSSD)',
        shortName: 'HRV',
        value: hrvVal,
        unit: 'ms',
        referenceRange: [42, 95],
        baseline: profile.baselineHRV,
        zScore: (hrvVal - profile.baselineHRV) / 12,
        domain: 'cardiovascular',
        status: hrvVal < 32 ? 'critical' : hrvVal < 42 ? 'low' : 'normal',
      },
      rhr: {
        id: 'rhr',
        name: 'Nocturnal Resting Heart Rate',
        shortName: 'RHR',
        value: rhrVal,
        unit: 'bpm',
        referenceRange: [45, 68],
        baseline: profile.baselineRestingHR,
        zScore: (rhrVal - profile.baselineRestingHR) / 5,
        domain: 'cardiovascular',
        status: rhrVal > 72 ? 'critical' : rhrVal > 62 ? 'high' : 'normal',
      },
      sbp: {
        id: 'sbp',
        name: 'Estimated Systolic Blood Pressure',
        shortName: 'SBP',
        value: sbpVal,
        unit: 'mmHg',
        referenceRange: [105, 125],
        baseline: 118,
        zScore: (sbpVal - 118) / 8,
        domain: 'cardiovascular',
        status: sbpVal > 140 ? 'critical' : sbpVal > 128 ? 'high' : 'normal',
      },
      orthoDelta: {
        id: 'orthoDelta',
        name: 'Orthostatic Pulse Incursion',
        shortName: 'Orthostatic',
        value: orthoDeltaVal,
        unit: 'bpm',
        referenceRange: [8, 18],
        baseline: 12,
        zScore: (orthoDeltaVal - 12) / 4,
        domain: 'cardiovascular',
        status: orthoDeltaVal > 28 ? 'critical' : orthoDeltaVal > 20 ? 'high' : 'normal',
      },
      glucose: {
        id: 'glucose',
        name: 'Fasting Interstitial Glucose',
        shortName: 'Glucose',
        value: glucoseVal,
        unit: 'mg/dL',
        referenceRange: [75, 100],
        baseline: 88,
        zScore: (glucoseVal - 88) / 9,
        domain: 'metabolic',
        status: glucoseVal > 125 ? 'critical' : glucoseVal > 105 ? 'high' : 'normal',
      },
      postprandial: {
        id: 'postprandial',
        name: 'Postprandial Peak Excursion',
        shortName: 'Postprandial',
        value: postprandialVal,
        unit: 'mg/dL',
        referenceRange: [95, 140],
        baseline: 125,
        zScore: (postprandialVal - 125) / 16,
        domain: 'metabolic',
        status: postprandialVal > 180 ? 'critical' : postprandialVal > 145 ? 'high' : 'normal',
      },
      glycemicCV: {
        id: 'glycemicCV',
        name: 'Glycemic Variability Index (CV)',
        shortName: 'Glycemic CV',
        value: glycemicCVVal,
        unit: '%',
        referenceRange: [10, 20],
        baseline: 14,
        zScore: (glycemicCVVal - 14) / 3,
        domain: 'metabolic',
        status: glycemicCVVal > 28 ? 'critical' : glycemicCVVal > 22 ? 'high' : 'normal',
      },
      lactate: {
        id: 'lactate',
        name: 'Lactate Clearance Proxy',
        shortName: 'Lactate',
        value: lactateSurrogate,
        unit: 'mmol/L',
        referenceRange: [0.8, 1.8],
        baseline: 1.1,
        zScore: (lactateSurrogate - 1.1) / 0.3,
        domain: 'metabolic',
        status: lactateSurrogate > 2.5 ? 'critical' : lactateSurrogate > 1.9 ? 'high' : 'normal',
      },
      deepSleep: {
        id: 'deepSleep',
        name: 'Slow Wave Deep Sleep Ratio',
        shortName: 'Deep Sleep',
        value: deepSleepVal,
        unit: '%',
        referenceRange: [16, 26],
        baseline: 21,
        zScore: (deepSleepVal - 21) / 3.5,
        domain: 'neurocognitive',
        status: deepSleepVal < 10 ? 'critical' : deepSleepVal < 15 ? 'low' : 'normal',
      },
      remFrag: {
        id: 'remFrag',
        name: 'REM Sleep Fragmentation',
        shortName: 'REM Frag',
        value: remFragmentationVal,
        unit: 'events/h',
        referenceRange: [1.0, 2.5],
        baseline: 1.8,
        zScore: (remFragmentationVal - 1.8) / 0.8,
        domain: 'neurocognitive',
        status: remFragmentationVal > 4.5 ? 'critical' : remFragmentationVal > 3.0 ? 'high' : 'normal',
      },
      sleepEff: {
        id: 'sleepEff',
        name: 'Nocturnal Sleep Efficiency',
        shortName: 'Sleep Eff',
        value: sleepEfficiencyVal,
        unit: '%',
        referenceRange: [88, 96],
        baseline: 92,
        zScore: (sleepEfficiencyVal - 92) / 4,
        domain: 'neurocognitive',
        status: sleepEfficiencyVal < 76 ? 'critical' : sleepEfficiencyVal < 84 ? 'low' : 'normal',
      },
      cogLatency: {
        id: 'cogLatency',
        name: 'Cognitive Motor Latency',
        shortName: 'Latency',
        value: cogLatencyVal,
        unit: 'ms',
        referenceRange: [240, 280],
        baseline: 255,
        zScore: (cogLatencyVal - 255) / 20,
        domain: 'neurocognitive',
        status: cogLatencyVal > 330 ? 'critical' : cogLatencyVal > 295 ? 'high' : 'normal',
      },
      spo2: {
        id: 'spo2',
        name: 'Nocturnal Mean SpO2',
        shortName: 'SpO2',
        value: spo2Val,
        unit: '%',
        referenceRange: [96.0, 99.5],
        baseline: 98.0,
        zScore: (spo2Val - 98.0) / 1.1,
        domain: 'respiratory',
        status: spo2Val < 92 ? 'critical' : spo2Val < 95 ? 'low' : 'normal',
      },
      spo2Dips: {
        id: 'spo2Dips',
        name: 'Nocturnal Desaturation Events (<92%)',
        shortName: 'SpO2 Dips',
        value: spo2DipsVal,
        unit: 'events',
        referenceRange: [0, 4],
        baseline: 2,
        zScore: (spo2DipsVal - 2) / 2,
        domain: 'respiratory',
        status: spo2DipsVal > 10 ? 'critical' : spo2DipsVal > 5 ? 'high' : 'normal',
      },
      respRate: {
        id: 'respRate',
        name: 'Nocturnal Breathing Rate',
        shortName: 'Resp Rate',
        value: respRateVal,
        unit: 'brpm',
        referenceRange: [12.0, 15.5],
        baseline: 13.5,
        zScore: (respRateVal - 13.5) / 1.0,
        domain: 'respiratory',
        status: respRateVal > 17.5 ? 'critical' : respRateVal > 15.5 ? 'high' : 'normal',
      },
      aerobicReserve: {
        id: 'aerobicReserve',
        name: 'Estimated Aerobic Reserve',
        shortName: 'Aerobic METs',
        value: aerobicReserveVal,
        unit: 'METs',
        referenceRange: [11.0, 16.0],
        baseline: 13.2,
        zScore: (aerobicReserveVal - 13.2) / 1.2,
        domain: 'respiratory',
        status: aerobicReserveVal < 9.5 ? 'critical' : aerobicReserveVal < 11.0 ? 'low' : 'normal',
      },
      crp: {
        id: 'crp',
        name: 'High-Sensitivity CRP Analog',
        shortName: 'hs-CRP',
        value: crpVal,
        unit: 'mg/L',
        referenceRange: [0.2, 1.2],
        baseline: 0.65,
        zScore: (crpVal - 0.65) / 0.5,
        domain: 'immune',
        status: crpVal > 3.0 ? 'critical' : crpVal > 1.5 ? 'high' : 'normal',
      },
      tempDev: {
        id: 'tempDev',
        name: 'Nocturnal Skin Temp Deviation',
        shortName: 'Temp Dev',
        value: tempDevVal,
        unit: '°C',
        referenceRange: [-0.3, 0.3],
        baseline: 0.0,
        zScore: tempDevVal / 0.25,
        domain: 'immune',
        status: tempDevVal > 0.75 ? 'critical' : tempDevVal > 0.35 ? 'high' : 'normal',
      },
      recoveryScore: {
        id: 'recoveryScore',
        name: 'Systemic Biological Readiness',
        shortName: 'Readiness',
        value: recoveryScoreVal,
        unit: '/100',
        referenceRange: [75, 100],
        baseline: 88,
        zScore: (recoveryScoreVal - 88) / 10,
        domain: 'immune',
        status: recoveryScoreVal < 40 ? 'critical' : recoveryScoreVal < 65 ? 'low' : 'normal',
      },
      leukocyteProxy: {
        id: 'leukocyteProxy',
        name: 'Leukocyte Activation Proxy',
        shortName: 'Leukocytes',
        value: leukocyteProxy,
        unit: 'AU',
        referenceRange: [4.0, 6.5],
        baseline: 4.8,
        zScore: (leukocyteProxy - 4.8) / 0.8,
        domain: 'immune',
        status: leukocyteProxy > 7.5 ? 'critical' : leukocyteProxy > 6.2 ? 'high' : 'normal',
      },
    };

    // Calculate domain risk scores (0 to 100)
    const cvScore = Math.round(clamp(cvBias + noise * 0.7, 5, 96));
    const metScore = Math.round(clamp(metBias + noise * 0.5, 6, 92));
    const neuroScore = Math.round(clamp(neuroBias + noise * 0.6, 7, 95));
    const respScore = Math.round(clamp(respBias + noise * 0.4, 4, 90));
    const immScore = Math.round(clamp(immBias + noise * 0.8, 5, 98));

    // Calculate delta vs 7-day trailing average (approximated smoothly)
    const prevEstimate = day > 7 ? simulation[day - 8].compositeRiskScore : phaseSeverityBias;
    const currentComposite = Math.round(
      clamp(
        cvScore * 0.28 +
          metScore * 0.18 +
          neuroScore * 0.22 +
          respScore * 0.14 +
          immScore * 0.18,
        0,
        100
      )
    );
    const delta7d = +(currentComposite - prevEstimate).toFixed(1);

    const domainScores: Record<PhysiologicalDomainKey, DomainRiskScore> = {
      cardiovascular: {
        key: 'cardiovascular',
        name: 'Cardiovascular & Autonomic Tone',
        score: cvScore,
        delta7d: +(cvScore - (day > 7 ? simulation[day - 8].domainScores.cardiovascular.score : cvScore)).toFixed(1),
        category: getRiskCategory(cvScore),
        primaryContributor: hrvVal < 35 ? 'rMSSD Vagal Suppression' : 'Resting Tachycardia',
        confidence: 0.94,
        biomarkers: [biomarkers.hrv, biomarkers.rhr, biomarkers.sbp, biomarkers.orthoDelta],
      },
      metabolic: {
        key: 'metabolic',
        name: 'Metabolic & Glycemic Stability',
        score: metScore,
        delta7d: +(metScore - (day > 7 ? simulation[day - 8].domainScores.metabolic.score : metScore)).toFixed(1),
        category: getRiskCategory(metScore),
        primaryContributor: postprandialVal > 160 ? 'Postprandial Peak Delay' : 'Fasting Drift',
        confidence: 0.91,
        biomarkers: [biomarkers.glucose, biomarkers.postprandial, biomarkers.glycemicCV, biomarkers.lactate],
      },
      neurocognitive: {
        key: 'neurocognitive',
        name: 'Neuro-Cognitive & Sleep Architecture',
        score: neuroScore,
        delta7d: +(neuroScore - (day > 7 ? simulation[day - 8].domainScores.neurocognitive.score : neuroScore)).toFixed(1),
        category: getRiskCategory(neuroScore),
        primaryContributor: deepSleepVal < 12 ? 'Slow-Wave Sleep Deficit' : 'REM Micro-Arousals',
        confidence: 0.96,
        biomarkers: [biomarkers.deepSleep, biomarkers.remFrag, biomarkers.sleepEff, biomarkers.cogLatency],
      },
      respiratory: {
        key: 'respiratory',
        name: 'Respiratory & Oxygen Dynamics',
        score: respScore,
        delta7d: +(respScore - (day > 7 ? simulation[day - 8].domainScores.respiratory.score : respScore)).toFixed(1),
        category: getRiskCategory(respScore),
        primaryContributor: spo2DipsVal > 6 ? 'Nocturnal Hypoxemia Dips' : 'Elevated Breathing Rate',
        confidence: 0.89,
        biomarkers: [biomarkers.spo2, biomarkers.spo2Dips, biomarkers.respRate, biomarkers.aerobicReserve],
      },
      immune: {
        key: 'immune',
        name: 'Systemic Immune & Inflammatory Load',
        score: immScore,
        delta7d: +(immScore - (day > 7 ? simulation[day - 8].domainScores.immune.score : immScore)).toFixed(1),
        category: getRiskCategory(immScore),
        primaryContributor: tempDevVal > 0.4 ? 'Nocturnal Pyrogenic Shift' : 'hs-CRP Elevation',
        confidence: 0.93,
        biomarkers: [biomarkers.crp, biomarkers.tempDev, biomarkers.recoveryScore, biomarkers.leukocyteProxy],
      },
    };

    // Find highest risk domain for alert generation
    const highestDomainEntry = Object.entries(domainScores).sort(
      ([, a], [, b]) => b.score - a.score
    )[0];
    const highestDomainKey = highestDomainEntry[0] as PhysiologicalDomainKey;
    const highestScore = highestDomainEntry[1].score;

    const alert = generateAlertForDay(day, dateStr, highestDomainKey, highestScore, biomarkers);

    // Milestone tags
    let milestone: string | undefined = undefined;
    const bookmark = DEFAULT_BOOKMARKS.find(b => b.day === day);
    if (bookmark) {
      milestone = bookmark.label;
    }

    simulation.push({
      day,
      date: dateStr,
      compositeRiskScore: currentComposite,
      category: getRiskCategory(currentComposite),
      domainScores,
      biomarkers,
      phaseName,
      milestone,
      activeAlert: alert,
    });
  }

  return simulation;
}

// Concordance calculation: compares user subjective feedback against objective model score
export function calculateConcordance(
  checkIn: Omit<SubjectiveCheckIn, 'concordanceScore' | 'concordanceLabel'>,
  dayData: DaySimulationData
): { score: number; label: SubjectiveCheckIn['concordanceLabel'] } {
  // Normalize subjective symptom burden: average of 1-10 scales converted to 0-100
  const subjectiveScore =
    ((checkIn.fatigueLevel +
      checkIn.cognitiveFog +
      checkIn.palpitations +
      checkIn.shortnessOfBreath +
      checkIn.muscleSoreness +
      checkIn.perceivedStress) /
      60) *
    100;

  const objectiveScore = dayData.compositeRiskScore;
  const difference = subjectiveScore - objectiveScore; // positive = feeling worse than model, negative = feeling better
  const absDiff = Math.abs(difference);

  // Score agreement: 100 minus absolute difference
  const score = Math.max(0, Math.min(100, Math.round(100 - absDiff)));

  let label: SubjectiveCheckIn['concordanceLabel'];
  if (absDiff <= 18) {
    label = 'High Agreement';
  } else if (absDiff <= 32) {
    label = 'Moderate Discordance';
  } else if (difference > 32) {
    label = 'Subjective Over-Reporting';
  } else {
    label = 'Subjective Under-Reporting';
  }

  return { score, label };
}
