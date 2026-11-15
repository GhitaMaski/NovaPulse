export type RiskCategory = 'optimal' | 'guarded' | 'elevated' | 'critical';

export interface BiomarkerReading {
  id: string;
  name: string;
  shortName: string;
  value: number;
  unit: string;
  referenceRange: [number, number]; // [min_normal, max_normal]
  baseline: number;
  zScore: number;
  domain: PhysiologicalDomainKey;
  status: 'normal' | 'low' | 'high' | 'critical';
}

export type PhysiologicalDomainKey =
  | 'cardiovascular'
  | 'metabolic'
  | 'neurocognitive'
  | 'respiratory'
  | 'immune';

export interface DomainRiskScore {
  key: PhysiologicalDomainKey;
  name: string;
  score: number; // 0 to 100
  delta7d: number; // change vs 7-day baseline
  category: RiskCategory;
  primaryContributor: string;
  confidence: number; // 0 to 1
  biomarkers: BiomarkerReading[];
}

export interface EvidenceContributor {
  id: string;
  biomarkerName: string;
  biomarkerKey: string;
  contributionPercent: number; // e.g. 38%
  direction: 'elevating' | 'mitigating';
  observedValue: string;
  baselineValue: string;
  clinicalSignificance: string;
}

export interface ExplainedAlert {
  id: string;
  day: number;
  date: string;
  severity: 'info' | 'guarded' | 'elevated' | 'critical';
  title: string;
  domain: PhysiologicalDomainKey;
  domainName: string;
  riskScore: number;
  summary: string;
  physiologicalMechanism: string;
  clinicalRationale: string;
  contributors: EvidenceContributor[];
  recommendedActions: string[];
  acknowledged: boolean;
  triagedAt?: string;
  notes?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  code: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  condition: string;
  baselineRestingHR: number;
  baselineHRV: number;
  scenarioDescription: string;
}

export interface DaySimulationData {
  day: number;
  date: string;
  compositeRiskScore: number; // 0 to 100
  category: RiskCategory;
  domainScores: Record<PhysiologicalDomainKey, DomainRiskScore>;
  biomarkers: Record<string, BiomarkerReading>;
  phaseName: string;
  milestone?: string;
  activeAlert?: ExplainedAlert;
}

export interface SubjectiveCheckIn {
  id?: number;
  day: number;
  timestamp: string;
  patientId: string;
  fatigueLevel: number; // 1-10
  cognitiveFog: number; // 1-10
  palpitations: number; // 1-10
  shortnessOfBreath: number; // 1-10
  muscleSoreness: number; // 1-10
  perceivedStress: number; // 1-10
  moodRating: 'very_low' | 'low' | 'neutral' | 'good' | 'optimal';
  protocolAdherence: boolean;
  freeformNotes: string;
  concordanceScore: number; // 0 - 100 agreement between subjective & objective
  concordanceLabel: 'High Agreement' | 'Moderate Discordance' | 'Subjective Over-Reporting' | 'Subjective Under-Reporting';
}

export interface TimelineBookmark {
  day: number;
  label: string;
  phase: string;
  severity: 'ok' | 'info' | 'warn' | 'danger';
  description: string;
}
