// src/lib/selectors.ts
import type {
  DomainScore,
  Band,
  Reading,
  Alert,
  Contribution,
  Severity,
  Domain,
  CrewMember,
} from '../shared/types';
import { CREW_MEMBERS } from './mock/crewData';
import { predictionKey, type PredictionLookup, type PredictionResult } from './predictions';

export interface AstronautHealth {
  crewId: string;
  name: string;
  score: number; // 0-100
  band: Band;
  domainScores: Record<Domain, DomainScore | undefined>;
  prediction?: PredictionResult;
}

export interface AnomalyItem {
  id: string;
  crewId: string;
  crewName: string;
  indicator: string;
  typeTitle: string;
  z: number;
  deltaPct: number;
  severity: Severity;
  severityLabel: 'Low' | 'Medium' | 'High';
  date: string;
  day: number;
  confidencePct: number;
}

export interface ExplanationFactor {
  indicator: string;
  z: number;
  deltaPct: number;
  weight: number;
  arrow: '↑' | '↓';
  impactScore: number; // weight * |z|
}

export interface AlertExplanation {
  alertId: string;
  title: string;
  likelyCause: string;
  confidencePct: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  factors: ExplanationFactor[];
  plainSentence: string;
}

/**
 * Uses the scenario model when available and otherwise averages the five domain scores.
 */
export function getAstronautHealth(
  crewId: string,
  day: number,
  allScores: DomainScore[],
  crew: CrewMember[] = CREW_MEMBERS,
  predictions?: PredictionLookup,
): AstronautHealth {
  const crewMember = crew.find((c) => c.id === crewId);
  const dayScores = allScores.filter((s) => s.crewId === crewId && s.day === day);

  const domainScores: Record<Domain, DomainScore | undefined> = {
    cardio: dayScores.find((s) => s.domain === 'cardio'),
    immune: dayScores.find((s) => s.domain === 'immune'),
    bone_muscle: dayScores.find((s) => s.domain === 'bone_muscle'),
    behavioral: dayScores.find((s) => s.domain === 'behavioral'),
    radiation: dayScores.find((s) => s.domain === 'radiation'),
  };

  const scoresList = Object.values(domainScores)
    .filter((s): s is DomainScore => s !== undefined)
    .map((s) => s.score);

  const avgScore =
    scoresList.length > 0
      ? Math.round(scoresList.reduce((acc, curr) => acc + curr, 0) / scoresList.length)
      : 85;

  const prediction = predictions?.[predictionKey(crewId, day)];
  const modelBands: Record<string, Band | undefined> = { NORMAL: 'green', WARNING: 'amber', CRITICAL: 'red' };
  const band = (prediction && modelBands[prediction.mission_status]) ??
    (avgScore < 50 ? 'red' : avgScore < 75 ? 'amber' : 'green');

  return {
    crewId,
    name: crewMember?.name ?? crewId,
    score: prediction?.health_score ?? avgScore,
    band,
    domainScores,
    prediction,
  };
}

/**
 * Crew Health Index: average of the individual astronaut health scores.
 */
export function getCrewHealthIndex(
  day: number,
  allScores: DomainScore[],
  crew: CrewMember[] = CREW_MEMBERS,
  predictions?: PredictionLookup,
): {
  index: number;
  band: Band;
  astronauts: AstronautHealth[];
  missionStatus: Band;
} {
  const astronauts = crew.map((c) => getAstronautHealth(c.id, day, allScores, crew, predictions));

  const total = astronauts.reduce((acc, a) => acc + a.score, 0);
  const mean = astronauts.length > 0 ? total / astronauts.length : 85;
  const index = predictions ? Number(mean.toFixed(2)) : Math.round(mean);

  let band: Band = 'green';
  if (index < 50) band = 'red';
  else if (index < 75) band = 'amber';

  // Mission Status = worst band in crew
  const hasRed = astronauts.some((a) => a.band === 'red');
  const hasAmber = astronauts.some((a) => a.band === 'amber');
  const missionStatus: Band = hasRed ? 'red' : hasAmber ? 'amber' : 'green';

  return {
    index,
    band,
    astronauts,
    missionStatus,
  };
}

export function getScenarioModelAlerts(day: number, crew: CrewMember[], predictions?: PredictionLookup) {
  return crew.flatMap((member) => {
    const result = predictions?.[predictionKey(member.id, day)];
    if (!result) return [];
    const signals = [];
    if (result.mission_status === 'CRITICAL' || result.mission_status === 'WARNING') {
      signals.push(`Mission status ${result.mission_status}`);
    }
    if (result.anomaly === 'Anomaly Detected') signals.push(result.anomaly);
    return signals.length > 0 ? [{ member, signals }] : [];
  });
}

/**
 * Derives anomalies where |z| >= 2 from domain contributors and alerts up to current day
 */
export function getAnomalies(
  currentDay: number,
  scores: DomainScore[],
  readings: Reading[],
  crew: CrewMember[] = CREW_MEMBERS
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  // Filter scores for currentDay (or recent 3-day window)
  const windowScores = scores.filter((s) => s.day === currentDay);

  for (const s of windowScores) {
    const reading = readings.find((r) => r.crewId === s.crewId && r.day === s.day);
    const member = crew.find((c) => c.id === s.crewId);

    for (const c of s.contributors) {
      if (Math.abs(c.z) >= 2.0) {
        let severity: Severity = 'watch';
        let severityLabel: 'Low' | 'Medium' | 'High' = 'Low';

        if (Math.abs(c.z) >= 3.5 || s.band === 'red') {
          severity = 'critical';
          severityLabel = 'High';
        } else if (Math.abs(c.z) >= 2.5 || s.band === 'amber') {
          severity = 'warning';
          severityLabel = 'Medium';
        }

        const anomalyId = `ANOM-${s.crewId}-D${s.day}-${c.indicator.replace(/[^a-zA-Z0-9]/g, '')}`;

        if (!anomalies.some((a) => a.id === anomalyId)) {
          anomalies.push({
            id: anomalyId,
            crewId: s.crewId,
            crewName: member?.name ?? s.crewId,
            indicator: c.indicator,
            typeTitle: getIndicatorAnomalyTitle(c.indicator, c.z),
            z: c.z,
            deltaPct: c.deltaPct,
            severity,
            severityLabel,
            date: reading?.date ?? '2026-03-01',
            day: s.day,
            confidencePct: Math.round(s.confidence * 100),
          });
        }
      }
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

function getIndicatorAnomalyTitle(indicator: string, z: number): string {
  if (indicator.includes('Heart Rate')) return z > 0 ? 'Tachycardia Drift' : 'Bradycardia Drift';
  if (indicator.includes('HRV')) return 'Parasympathetic Withdrawal (Low HRV)';
  if (indicator.includes('Temperature')) return 'Core Pyrexia Spike';
  if (indicator.includes('Sleep')) return 'Slow-Wave Sleep Deprivation';
  if (indicator.includes('CO2')) return 'Ambient Hypercapnia Exposure';
  if (indicator.includes('Dose')) return 'Radiation Flux Excursion';
  if (indicator.includes('Stress')) return 'High Operational Stress';
  return `${indicator} Variance`;
}

/**
 * Formats AI Explanation for an alert:
 * Evidence sorted by weight * |z|, arrows from deltaPct sign, plain sentence, confidence.
 */
export function getAlertExplanation(alert: Alert): AlertExplanation {
  const factors: ExplanationFactor[] = alert.evidence
    .map((e) => ({
      indicator: e.indicator,
      z: e.z,
      deltaPct: e.deltaPct,
      weight: e.weight,
      arrow: e.deltaPct >= 0 ? ('↑' as const) : ('↓' as const),
      impactScore: Number((e.weight * Math.abs(e.z)).toFixed(3)),
    }))
    .sort((a, b) => b.impactScore - a.impactScore);

  const confidencePct = alert.confidence === 'high' ? 94 : alert.confidence === 'medium' ? 78 : 55;

  const topFactor = factors[0];
  const plainSentence = topFactor
    ? `Elevated risk triggered primarily by ${topFactor.indicator} (${topFactor.arrow} ${Math.abs(topFactor.deltaPct)}%), reflecting ${alert.likelyCause.toLowerCase()}`
    : `Elevated physiological strain detected under ${alert.likelyCause.toLowerCase()}`;

  return {
    alertId: alert.id,
    title: alert.title,
    likelyCause: alert.likelyCause,
    confidencePct,
    confidenceLevel: alert.confidence,
    factors,
    plainSentence,
  };
}

/**
 * Gets date of the latest reading at the current scrubber day
 */
export function getLastUpdate(day: number, readings: Reading[]): string {
  const currentReadings = readings.filter((r) => r.day === day);
  return currentReadings[0]?.date ?? `Day ${day} Telemetry`;
}
