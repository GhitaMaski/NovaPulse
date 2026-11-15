// src/lib/mock/crewData.ts
import type { CrewMember } from '../../shared/types';

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'CREW-01',
    name: 'Dr. Nadia Patel',
    role: 'Mission Commander / Astrobiologist',
    callsign: 'Astra',
    age: 38,
    bloodType: 'O+',
    baselines: {
      restingHr: 54,
      hrv: 66,
      sbp: 114,
      dbp: 74,
      spo2: 98.2,
      coreTemp: 36.6,
      respRate: 13.0,
      sleepHours: 7.4,
    },
  },
  {
    id: 'CREW-02',
    name: 'Leo Thorne',
    role: 'Chief Flight Engineer',
    callsign: 'Forge',
    age: 42,
    bloodType: 'A+',
    baselines: {
      restingHr: 60,
      hrv: 54,
      sbp: 118,
      dbp: 76,
      spo2: 97.8,
      coreTemp: 36.7,
      respRate: 14.2,
      sleepHours: 7.1,
    },
  },
  {
    id: 'CREW-03',
    name: 'Dr. Aiko Tanaka',
    role: 'Medical Officer / Payload Specialist',
    callsign: 'Nova',
    age: 34,
    bloodType: 'B+',
    baselines: {
      restingHr: 52,
      hrv: 72,
      sbp: 110,
      dbp: 72,
      spo2: 98.6,
      coreTemp: 36.5,
      respRate: 12.8,
      sleepHours: 7.6,
    },
  },
];
