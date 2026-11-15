import type { AnomalyScore, CrewMember, MissionResult, Reading, SpaceEvent } from '../shared/types';
import { analyzeTelemetry } from './analyzeTelemetry';
import { CREW_MEMBERS } from './mock/crewData';
import { generateMissionData, type InjectedScenario } from './mock/generator';

export interface MissionData {
  readings: Reading[];
  events: SpaceEvent[];
  result: MissionResult;
  crew: CrewMember[];
}

interface ApiReading extends Omit<Reading, 'date'> {
  date?: string;
  socialContactMin?: number;
}

interface ApiEvent extends SpaceEvent {
  details?: string;
}

// The API uses ppm for CO₂ and a 1–5 subjective scale.
function toDashboardScale(value?: number) {
  return value == null ? undefined : Number((1 + (value - 1) * 9 / 4).toFixed(2));
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`NovaPulse API returned ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

export function getLocalMission(scenario: InjectedScenario): MissionData {
  return { ...generateMissionData(scenario), crew: CREW_MEMBERS };
}

export async function loadBackendMission(): Promise<MissionData> {
  const [config, crew, apiReadings, apiEvents] = await Promise.all([
    fetchJson<{ startDate: string; totalDays: number }>('mission'),
    fetchJson<CrewMember[]>('crew'),
    fetchJson<ApiReading[]>('readings'),
    fetchJson<ApiEvent[]>('events'),
  ]);

  if (!config.totalDays || !crew.length || !apiReadings.length) {
    throw new Error('NovaPulse API mission is incomplete');
  }

  const missionStart = Date.parse(config.startDate);
  const readings = apiReadings.map<Reading>((reading) => ({
    ...reading,
    date: reading.date ?? new Date(missionStart + (reading.day - 1) * 86_400_000).toISOString().slice(0, 10),
    cabinCo2: reading.cabinCo2 / 10_000,
    socialMin: reading.socialMin ?? reading.socialContactMin,
  }));
  const events = apiEvents.map<SpaceEvent>((event) => ({
    ...event,
    description: event.description ?? event.details,
  }));
  const result = analyzeTelemetry(readings, crew, events);
  return {
    crew,
    events,
    result,
    readings: readings.map((reading) => ({
      ...reading,
      mood: toDashboardScale(reading.mood),
      stress: toDashboardScale(reading.stress),
      fatigue: toDashboardScale(reading.fatigue),
    })),
  };
}

export function loadAnomalyScores(crew: CrewMember[]): Promise<AnomalyScore[]> {
  return Promise.all(crew.map(({ id }) => fetchJson<AnomalyScore[]>(`anomaly-scores?crewId=${encodeURIComponent(id)}`)))
    .then((results) => results.flat());
}

export async function loadMissionReadings(crewId: string, day: number) {
  const query = new URLSearchParams({ crewId, to: String(day) });
  const response = await fetch(`/api/v1/readings?${query}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Could not load mission readings (HTTP ${response.status}).`);
  const readings: ApiReading[] = await response.json();
  return readings.map((reading) => ({
    ...reading,
    cabinCo2: reading.cabinCo2 / 10_000,
    stress: toDashboardScale(reading.stress),
  }));
}
