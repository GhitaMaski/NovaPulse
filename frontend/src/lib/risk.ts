// src/lib/risk.ts
import type { Reading } from '../shared/types';

export interface RiskCategoryPrediction {
  category: 'Fatigue Risk' | 'Cardiovascular Strain' | 'Sleep Deprivation Risk';
  riskScore: number; // 0-100
  horizon: '72 h';
  trendSlope: number; // rate of change
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  keyContributors: string[];
  disclaimer: 'Estimated trend-based risk, not a diagnosis.';
}

export interface CrewRiskProfile {
  crewId: string;
  day: number;
  overall72hRisk: number; // 0-100
  categories: RiskCategoryPrediction[];
  disclaimer: 'Estimated trend-based risk, not a diagnosis.';
}

/**
 * Standard simple linear regression slope
 * returns slope m for y = m*x + b
 */
export function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Computes 72 h risk prediction over the trailing 7 days
 */
export function predict72hRisk(
  crewId: string,
  currentDay: number,
  allReadings: Reading[]
): CrewRiskProfile {
  // Extract trailing 7 days of readings for this astronaut
  const startDay = Math.max(1, currentDay - 6);
  const trailingReadings = allReadings
    .filter((r) => r.crewId === crewId && r.day >= startDay && r.day <= currentDay)
    .sort((a, b) => a.day - b.day);

  const fallback: CrewRiskProfile = {
    crewId,
    day: currentDay,
    overall72hRisk: 15,
    categories: [
      {
        category: 'Fatigue Risk',
        riskScore: 12,
        horizon: '72 h',
        trendSlope: 0,
        trendDirection: 'stable',
        keyContributors: ['Fatigue self-report (stable)', 'Reaction latency (nominal)'],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
      {
        category: 'Cardiovascular Strain',
        riskScore: 14,
        horizon: '72 h',
        trendSlope: 0,
        trendDirection: 'stable',
        keyContributors: ['Resting HR (baseline)', 'HRV autonomic tone (nominal)'],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
      {
        category: 'Sleep Deprivation Risk',
        riskScore: 18,
        horizon: '72 h',
        trendSlope: 0,
        trendDirection: 'stable',
        keyContributors: ['Sleep duration (stable)', 'Circadian alignment (nominal)'],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
    ],
    disclaimer: 'Estimated trend-based risk, not a diagnosis.',
  };

  if (trailingReadings.length === 0) return fallback;

  // Extract arrays for regression
  const hrvVals = trailingReadings.map((r) => r.hrv);
  const hrVals = trailingReadings.map((r) => r.restingHr);
  const sleepVals = trailingReadings.map((r) => r.sleepHours);
  const fatigueVals = trailingReadings.map((r) => r.fatigue ?? 2);
  const stressVals = trailingReadings.map((r) => r.stress ?? 2);
  const doseVals = trailingReadings.map((r) => r.doseMsv);

  const hrvSlope = calculateSlope(hrvVals); // negative = worsening
  const hrSlope = calculateSlope(hrVals); // positive = worsening
  const sleepSlope = calculateSlope(sleepVals); // negative = worsening
  const fatigueSlope = calculateSlope(fatigueVals); // positive = worsening
  const stressSlope = calculateSlope(stressVals); // positive = worsening
  const doseSlope = calculateSlope(doseVals); // positive = worsening

  const latest = trailingReadings[trailingReadings.length - 1];

  // 1. Fatigue Risk
  // Factors: current fatigue, slope, stress, dose
  const currentFatigue = latest.fatigue ?? 2;
  const rawFatigueRisk =
    (currentFatigue / 10) * 55 +
    fatigueSlope * 12 +
    (stressSlope > 0 ? stressSlope * 8 : 0) +
    (latest.doseMsv > 2 ? 15 : 0);
  const fatigueRiskScore = Math.max(5, Math.min(98, Math.round(rawFatigueRisk)));

  // 2. Cardiovascular Strain
  // Factors: resting HR slope, HRV decline, dose
  const hrElevated = Math.max(0, latest.restingHr - 60);
  const rawCardioRisk =
    (hrElevated / 30) * 45 +
    hrSlope * 8 -
    hrvSlope * 6 +
    (latest.doseMsv > 5 ? 18 : 0);
  const cardioRiskScore = Math.max(5, Math.min(98, Math.round(rawCardioRisk)));

  // 3. Sleep Deprivation Risk
  // Factors: sleep hours (<7h), sleep slope, stress
  const sleepDeficit = Math.max(0, 7.5 - latest.sleepHours);
  const rawSleepRisk =
    (sleepDeficit / 4.5) * 60 -
    sleepSlope * 14 +
    ((latest.stress ?? 2) / 10) * 20;
  const sleepRiskScore = Math.max(5, Math.min(98, Math.round(rawSleepRisk)));

  const overall = Math.round(
    fatigueRiskScore * 0.35 + cardioRiskScore * 0.35 + sleepRiskScore * 0.3
  );

  return {
    crewId,
    day: currentDay,
    overall72hRisk: overall,
    categories: [
      {
        category: 'Fatigue Risk',
        riskScore: fatigueRiskScore,
        horizon: '72 h',
        trendSlope: Number(fatigueSlope.toFixed(2)),
        trendDirection: fatigueSlope > 0.15 ? 'increasing' : fatigueSlope < -0.15 ? 'decreasing' : 'stable',
        keyContributors: [
          `Fatigue level: ${latest.fatigue ?? 2}/10 (${fatigueSlope > 0 ? 'Worsening trajectory' : 'Stable'})`,
          `Operational stress: ${latest.stress ?? 2}/10`,
          latest.doseMsv > 2 ? `Radiation flux: ${latest.doseMsv} mSv/d` : 'Dosimeter nominal',
        ],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
      {
        category: 'Cardiovascular Strain',
        riskScore: cardioRiskScore,
        horizon: '72 h',
        trendSlope: Number(hrSlope.toFixed(2)),
        trendDirection: hrSlope > 0.2 ? 'increasing' : hrSlope < -0.2 ? 'decreasing' : 'stable',
        keyContributors: [
          `Resting Heart Rate: ${latest.restingHr} bpm (${hrSlope > 0 ? '+drift' : 'stable'})`,
          `HRV rMSSD: ${latest.hrv} ms (${hrvSlope < 0 ? 'vagal suppression' : 'preserved'})`,
          `SpO2: ${latest.spo2}%`,
        ],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
      {
        category: 'Sleep Deprivation Risk',
        riskScore: sleepRiskScore,
        horizon: '72 h',
        trendSlope: Number(sleepSlope.toFixed(2)),
        trendDirection: sleepSlope < -0.15 ? 'increasing' : sleepSlope > 0.15 ? 'decreasing' : 'stable',
        keyContributors: [
          `Sleep duration: ${latest.sleepHours} hrs (${sleepSlope < 0 ? 'contracting' : 'stable'})`,
          `Sleep efficiency: ${latest.sleepEff}%`,
          `Reaction latency: ${latest.reactionMs ?? 250} ms`,
        ],
        disclaimer: 'Estimated trend-based risk, not a diagnosis.',
      },
    ],
    disclaimer: 'Estimated trend-based risk, not a diagnosis.',
  };
}
