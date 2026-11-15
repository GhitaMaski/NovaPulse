// src/shared/types.ts
// FROZEN TYPES — do not modify

export type Domain = 'cardio' | 'immune' | 'bone_muscle' | 'behavioral' | 'radiation';

export type Severity = 'info' | 'watch' | 'warning' | 'critical';

export type Band = 'green' | 'amber' | 'red';

export interface Reading {
  id: string;
  crewId: string;
  day: number;
  date: string;
  restingHr: number;
  hrv: number;
  sbp: number;
  dbp: number;
  spo2: number;
  coreTemp: number;
  respRate: number;
  sleepHours: number;
  sleepEff: number;
  exerciseMin: number;
  resistanceLoad: number;
  gripKg?: number;
  boneMarker?: number;
  mood?: number;
  fatigue?: number;
  stress?: number;
  socialMin?: number;
  reactionMs?: number;
  symptoms: string[];
  doseMsv: number;
  cabinCo2: number;
  cabinTemp: number;
  cabinRh: number;
}

export interface Contribution {
  indicator: string;
  z: number;
  deltaPct: number;
  windowDays: number;
  weight: number;
}

export interface DomainScore {
  crewId: string;
  day: number;
  domain: Domain;
  score: number; // 0-100
  band: Band;
  contributors: Contribution[];
  confidence: number; // 0-1
}

export interface ActionItem {
  rank: number;
  text: string;
  escalate: boolean;
}

export interface Alert {
  id: string;
  crewId: string;
  day: number;
  domain: Domain;
  severity: Severity;
  title: string;
  evidence: Contribution[];
  likelyCause: string;
  confidence: 'low' | 'medium' | 'high';
  actions: ActionItem[];
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface SpaceEvent {
  id: string;
  type: string;
  startDay: number;
  endDay: number;
  source: 'donki' | 'scenario' | 'injected';
  crewIds?: string[];
  magnitude?: string;
  title?: string;
  description?: string;
}

export interface MissionResult {
  scores: DomainScore[];
  alerts: Alert[];
}

export interface CrewMember {
  id: string; // e.g. 'CREW-01'
  name: string; // 'Nadia Patel'
  role: string; // 'Commander / Astrobiologist'
  callsign?: string; // 'Astra'
  age?: number;
  bloodType?: string;
  baselines: {
    restingHr: number;
    hrv: number;
    sbp: number;
    dbp: number;
    spo2: number;
    coreTemp: number;
    respRate: number;
    sleepHours: number;
  } & Partial<Record<TelemetryMetric, number>>;
  spreads?: Partial<Record<TelemetryMetric, number>>;
}

export type TelemetryMetric = 'restingHr' | 'hrv' | 'sbp' | 'coreTemp' | 'sleepHours'
  | 'exerciseMin' | 'gripKg' | 'boneMarker' | 'stress' | 'reactionMs';

export interface AnomalyScore {
  crewId: string;
  day: number;
  anomalyScore: number;
  isAnomaly: boolean;
}
