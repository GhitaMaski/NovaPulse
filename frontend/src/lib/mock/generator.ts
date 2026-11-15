// src/lib/mock/generator.ts
import type {
  Reading,
  SpaceEvent,
  DomainScore,
  Alert,
  MissionResult,
  Domain,
  Band,
  Severity,
  Contribution,
} from '../../shared/types';
import { CREW_MEMBERS } from './crewData';

export type InjectedScenario = 'none' | 'radiation' | 'co2' | 'infection' | 'sleep';

// Seeded pseudorandom function
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function scoreToBand(score: number): Band {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

export function generateMissionData(scenario: InjectedScenario = 'none'): {
  readings: Reading[];
  events: SpaceEvent[];
  result: MissionResult;
} {
  const readings: Reading[] = [];
  const scores: DomainScore[] = [];
  const alerts: Alert[] = [];
  const scenarioEvents: Record<Exclude<InjectedScenario, 'none'>, SpaceEvent> = {
    radiation: {
      id: 'EVT-01',
      type: 'FLR',
      startDay: 48,
      endDay: 52,
      source: 'donki',
      magnitude: 'M4.8',
      title: 'Solar Flare M-Class Detected',
      description: 'Active region 3615 coronal mass ejection facing interplanetary trajectory.',
    },
    co2: {
      id: 'EVT-02',
      type: 'IPS',
      startDay: 96,
      endDay: 101,
      source: 'scenario',
      magnitude: '0.72% pCO2',
      title: 'ECLSS Secondary Scrubber Saturation',
      description: 'Elevated ambient CO2 partial pressure in hab module during filter rotation.',
    },
    infection: {
      id: 'EVT-03',
      type: 'injected',
      startDay: 135,
      endDay: 142,
      source: 'scenario',
      magnitude: '+1.9°C',
      title: 'Subacute Pathogen Vector',
      description: 'Localized viral reactivation flare with elevated inflammatory markers.',
    },
    sleep: {
      id: 'EVT-04',
      type: 'injected',
      startDay: 169,
      endDay: 175,
      source: 'scenario',
      magnitude: 'Δ3.5h Sleep',
      title: 'Orbital Maneuver Sleep Disruption',
      description: 'High-frequency telemetry pass causing multi-cycle circadian fragmentation.',
    },
  };

  const startDate = new Date(2026, 2, 1); // March 1, 2026

  for (let day = 1; day <= 200; day++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + (day - 1));
    const dateStr = curDate.toISOString().split('T')[0];

    for (let cIdx = 0; cIdx < CREW_MEMBERS.length; cIdx++) {
      const crew = CREW_MEMBERS[cIdx];
      const seed = day * 100 + cIdx * 17;
      const noise = (seededRandom(seed) - 0.5) * 2;
      const noise2 = (seededRandom(seed + 1) - 0.5) * 2;
      const noise3 = (seededRandom(seed + 2) - 0.5) * 2;
      const noise4 = (seededRandom(seed + 3) - 0.5) * 2;

      // Slow mission microgravity drift
      const missionDayRatio = day / 200;
      const boneLossDrift = -0.05 * missionDayRatio; // gradual demineralization proxy
      const muscleLossDrift = -0.04 * missionDayRatio;

      // Storyline impacts
      let radDose = 0.42 + (seededRandom(seed + 9) * 0.08); // mSv/day normal background
      let co2Level = 0.22 + (seededRandom(seed + 10) * 0.03); // % normal
      let tempOffset = 0;
      let hrOffset = 0;
      let hrvFactor = 1.0;
      let sleepOffset = 0;
      let stressLevel = Math.round(2 + seededRandom(seed + 4) * 2);
      let fatigueLevel = Math.round(2 + seededRandom(seed + 5) * 2);
      const symptoms: string[] = [];

      // 1. Radiation storm event (Day 46 - 54)
      const isRadDay = day >= 46 && day <= 54;
      if (isRadDay && (scenario === 'radiation' || scenario === 'none')) {
        const peakFactor = 1 - Math.abs(day - 50) / 4.5;
        if (peakFactor > 0) {
          radDose += peakFactor * 26.5; // reaches ~27 mSv
          fatigueLevel += Math.round(peakFactor * 3);
          hrvFactor *= 1 - (peakFactor * 0.25);
          if (peakFactor > 0.5) {
            symptoms.push('Mild nausea', 'Retinal phosphenes');
          }
        }
      }

      // 2. CO2 rise event (Day 95 - 103)
      const isCo2Day = day >= 95 && day <= 103;
      if (isCo2Day && (scenario === 'co2' || scenario === 'none')) {
        const peakFactor = 1 - Math.abs(day - 99) / 4.5;
        if (peakFactor > 0) {
          co2Level += peakFactor * 0.52; // climbs to ~0.74%
          hrOffset += peakFactor * 10;
          stressLevel += Math.round(peakFactor * 3);
          symptoms.push('Frontal headache', 'Mild dyspnea');
        }
      }

      // 3. Infection event (Day 135 - 143, predominantly CREW-02 Leo, slight sympathetic spread)
      const isInfectionDay = day >= 135 && day <= 143;
      if (isInfectionDay && (scenario === 'infection' || scenario === 'none')) {
        const peakFactor = 1 - Math.abs(day - 139) / 4.5;
        if (peakFactor > 0) {
          if (crew.id === 'CREW-02') {
            tempOffset += peakFactor * 1.85; // core temp up to 38.5°C
            hrOffset += peakFactor * 22;
            hrvFactor *= 1 - (peakFactor * 0.55);
            fatigueLevel = Math.min(10, fatigueLevel + Math.round(peakFactor * 6));
            symptoms.push('Fever', 'Myalgia', 'Pharyngitis');
          } else {
            // subtle immune alertness in crewmates
            tempOffset += peakFactor * 0.2;
            stressLevel += 1;
          }
        }
      }

      // 4. Sleep deprivation & stress event (Day 169 - 177, Nadia & Leo)
      const isSleepDay = day >= 169 && day <= 177;
      if (isSleepDay && (scenario === 'sleep' || scenario === 'none')) {
        const peakFactor = 1 - Math.abs(day - 173) / 4.5;
        if (peakFactor > 0) {
          if (crew.id === 'CREW-01' || crew.id === 'CREW-02') {
            sleepOffset -= peakFactor * 3.8; // drops sleep to ~3.5 hours
            stressLevel = Math.min(10, stressLevel + Math.round(peakFactor * 6));
            fatigueLevel = Math.min(10, fatigueLevel + Math.round(peakFactor * 6));
            hrvFactor *= 1 - (peakFactor * 0.4);
            symptoms.push('Severe daytime somnolence', 'Concentration latency');
          }
        }
      }

      // Calculate concrete reading
      const restingHr = Math.round(crew.baselines.restingHr + hrOffset + noise * 2.5);
      const hrv = Math.round(clamp(crew.baselines.hrv * hrvFactor + noise2 * 3, 14, 110));
      const sbp = Math.round(crew.baselines.sbp + (hrOffset * 0.4) + noise3 * 3);
      const dbp = Math.round(crew.baselines.dbp + (hrOffset * 0.25) + noise4 * 2);
      const spo2 = Number(clamp(crew.baselines.spo2 - (co2Level > 0.4 ? 1.4 : 0) + noise * 0.2, 91, 99.8).toFixed(1));
      const coreTemp = Number(clamp(crew.baselines.coreTemp + tempOffset + (noise2 * 0.08), 35.8, 39.2).toFixed(1));
      const respRate = Number(clamp(crew.baselines.respRate + (co2Level > 0.4 ? 4.5 : 0) + (tempOffset > 0.8 ? 3.5 : 0) + noise3 * 0.4, 10, 24).toFixed(1));
      const sleepHours = Number(clamp(crew.baselines.sleepHours + sleepOffset + noise4 * 0.4, 2.8, 9.5).toFixed(1));
      const sleepEff = Number(clamp(91 - (Math.abs(sleepOffset) * 6) - (stressLevel * 2) + noise * 2, 45, 98).toFixed(1));
      const exerciseMin = Math.round(clamp(75 + noise2 * 10 - (fatigueLevel > 6 ? 35 : 0), 20, 110));
      const resistanceLoad = Math.round(clamp(140 + muscleLossDrift * 100 + noise3 * 8, 90, 175));
      const gripKg = Number((42 + muscleLossDrift * 25 + noise4 * 1.5).toFixed(1));
      const boneMarker = Number((1.05 + boneLossDrift + noise * 0.05).toFixed(2));
      const reactionMs = Math.round(clamp(250 + (fatigueLevel * 14) + (stressLevel * 8) + noise2 * 8, 220, 480));

      const reading: Reading = {
        id: `RD-${crew.id}-D${day}`,
        crewId: crew.id,
        day,
        date: dateStr,
        restingHr,
        hrv,
        sbp,
        dbp,
        spo2,
        coreTemp,
        respRate,
        sleepHours,
        sleepEff,
        exerciseMin,
        resistanceLoad,
        gripKg,
        boneMarker,
        mood: Math.max(1, Math.min(10, 8 - Math.floor(stressLevel / 2) - Math.floor(fatigueLevel / 3))),
        fatigue: fatigueLevel,
        stress: stressLevel,
        socialMin: Math.round(clamp(65 - (fatigueLevel * 4) + noise * 5, 10, 95)),
        reactionMs,
        symptoms,
        doseMsv: Number(radDose.toFixed(2)),
        cabinCo2: Number(co2Level.toFixed(2)),
        cabinTemp: Number((21.5 + noise * 0.4).toFixed(1)),
        cabinRh: Number((44.5 + noise2 * 1.5).toFixed(1)),
      };
      readings.push(reading);

      // DOMAIN SCORES CALCULATION (0-100)
      // 1. Cardio
      const cardioHrZ = (restingHr - crew.baselines.restingHr) / 4.5;
      const cardioHrvZ = (hrv - crew.baselines.hrv) / 7.0;
      const cardioScore = clamp(
        Math.round(92 - Math.max(0, cardioHrZ) * 6.5 + Math.min(0, cardioHrvZ) * 8.5),
        25,
        98
      );
      const cardioContribs: Contribution[] = [
        { indicator: 'HRV (rMSSD)', z: Number(cardioHrvZ.toFixed(2)), deltaPct: Number((((hrv - crew.baselines.hrv) / crew.baselines.hrv) * 100).toFixed(1)), windowDays: 7, weight: 0.45 },
        { indicator: 'Resting Heart Rate', z: Number(cardioHrZ.toFixed(2)), deltaPct: Number((((restingHr - crew.baselines.restingHr) / crew.baselines.restingHr) * 100).toFixed(1)), windowDays: 7, weight: 0.35 },
        { indicator: 'Systolic Blood Pressure', z: Number(((sbp - crew.baselines.sbp) / 6).toFixed(2)), deltaPct: Number((((sbp - crew.baselines.sbp) / crew.baselines.sbp) * 100).toFixed(1)), windowDays: 7, weight: 0.20 },
      ];
      scores.push({
        crewId: crew.id,
        day,
        domain: 'cardio',
        score: cardioScore,
        band: scoreToBand(cardioScore),
        contributors: cardioContribs,
        confidence: 0.94,
      });

      // 2. Immune
      const tempZ = (coreTemp - crew.baselines.coreTemp) / 0.25;
      const immuneScore = clamp(
        Math.round(94 - Math.max(0, tempZ) * 18 - (radDose > 5 ? (radDose / 30) * 25 : 0)),
        20,
        99
      );
      const immuneContribs: Contribution[] = [
        { indicator: 'Core Body Temperature', z: Number(tempZ.toFixed(2)), deltaPct: Number((((coreTemp - crew.baselines.coreTemp) / crew.baselines.coreTemp) * 100).toFixed(1)), windowDays: 3, weight: 0.55 },
        { indicator: 'Systemic Cytokine Proxy', z: Number((tempZ * 1.2).toFixed(2)), deltaPct: Number((tempZ * 14).toFixed(1)), windowDays: 3, weight: 0.30 },
        { indicator: 'Nocturnal HRV Recovery', z: Number(cardioHrvZ.toFixed(2)), deltaPct: Number((((hrv - crew.baselines.hrv) / crew.baselines.hrv) * 100).toFixed(1)), windowDays: 7, weight: 0.15 },
      ];
      scores.push({
        crewId: crew.id,
        day,
        domain: 'immune',
        score: immuneScore,
        band: scoreToBand(immuneScore),
        contributors: immuneContribs,
        confidence: 0.91,
      });

      // 3. Bone & Muscle
      const boneScore = clamp(
        Math.round(90 + (boneLossDrift * 60) + (muscleLossDrift * 45) + (exerciseMin < 45 ? -14 : 0)),
        40,
        96
      );
      const boneContribs: Contribution[] = [
        { indicator: 'Grip Strength', z: Number((muscleLossDrift * 10).toFixed(2)), deltaPct: Number((muscleLossDrift * 20).toFixed(1)), windowDays: 30, weight: 0.40 },
        { indicator: 'Microgravity Bone Demineralization', z: Number((boneLossDrift * 8).toFixed(2)), deltaPct: Number((boneLossDrift * 15).toFixed(1)), windowDays: 30, weight: 0.35 },
        { indicator: 'Daily Resistance Load', z: Number(((exerciseMin - 75) / 15).toFixed(2)), deltaPct: Number((((exerciseMin - 75) / 75) * 100).toFixed(1)), windowDays: 7, weight: 0.25 },
      ];
      scores.push({
        crewId: crew.id,
        day,
        domain: 'bone_muscle',
        score: boneScore,
        band: scoreToBand(boneScore),
        contributors: boneContribs,
        confidence: 0.88,
      });

      // 4. Behavioral & Sleep
      const sleepHoursZ = (sleepHours - crew.baselines.sleepHours) / 0.8;
      const stressZ = (stressLevel - 3) / 1.5;
      const behavScore = clamp(
        Math.round(92 + Math.min(0, sleepHoursZ) * 12 - Math.max(0, stressZ) * 8 - (fatigueLevel > 6 ? 12 : 0)),
        24,
        98
      );
      const behavContribs: Contribution[] = [
        { indicator: 'Sleep Duration', z: Number(sleepHoursZ.toFixed(2)), deltaPct: Number((((sleepHours - crew.baselines.sleepHours) / crew.baselines.sleepHours) * 100).toFixed(1)), windowDays: 7, weight: 0.45 },
        { indicator: 'Subjective Operational Stress', z: Number(stressZ.toFixed(2)), deltaPct: Number(((stressLevel - 3) * 20).toFixed(1)), windowDays: 3, weight: 0.30 },
        { indicator: 'Psychomotor Reaction Latency', z: Number(((reactionMs - 250) / 30).toFixed(2)), deltaPct: Number((((reactionMs - 250) / 250) * 100).toFixed(1)), windowDays: 3, weight: 0.25 },
      ];
      scores.push({
        crewId: crew.id,
        day,
        domain: 'behavioral',
        score: behavScore,
        band: scoreToBand(behavScore),
        contributors: behavContribs,
        confidence: 0.93,
      });

      // 5. Radiation
      const radZ = (radDose - 0.42) / 1.5;
      const radScore = clamp(
        Math.round(96 - (radDose > 1.0 ? Math.min(75, radDose * 2.8) : 0)),
        18,
        99
      );
      const radContribs: Contribution[] = [
        { indicator: 'Cumulative Absorbed Dose', z: Number(radZ.toFixed(2)), deltaPct: Number((((radDose - 0.42) / 0.42) * 100).toFixed(1)), windowDays: 1, weight: 0.70 },
        { indicator: 'Cabin Dosimeter Flux', z: Number((radZ * 0.9).toFixed(2)), deltaPct: Number((((radDose - 0.42) / 0.42) * 90).toFixed(1)), windowDays: 1, weight: 0.30 },
      ];
      scores.push({
        crewId: crew.id,
        day,
        domain: 'radiation',
        score: radScore,
        band: scoreToBand(radScore),
        contributors: radContribs,
        confidence: 0.98,
      });

      // INJECTED DETAILED ALERTS ON SPECIFIC STORYLINE DAYS
      // Radiation Alert
      if (day === 50) {
        alerts.push({
          id: `ALT-RAD-D${day}-${crew.id}`,
          crewId: crew.id,
          day,
          domain: 'radiation',
          severity: 'critical',
          title: 'Acute Solar Energetic Particle (SEP) Dose Excursion',
          evidence: radContribs,
          likelyCause: 'Interplanetary coronal mass ejection passage with localized dosimeter peak (27.2 mSv/day).',
          confidence: 'high',
          status: 'open',
          actions: [
            { rank: 1, text: 'Relocate to radiation storm shelter in central habitat module.', escalate: true },
            { rank: 2, text: 'Deploy water-wall hydrogenous shielding modules.', escalate: false },
            { rank: 3, text: 'Administer radioprotective antioxidant protocol (Amifostine analog).', escalate: true },
            { rank: 4, text: 'Perform personal active dosimeter readout verification.', escalate: false },
          ],
        });
      }

      // CO2 Alert
      if (day === 99 && crew.id === 'CREW-01') {
        alerts.push({
          id: `ALT-CO2-D${day}-${crew.id}`,
          crewId: crew.id,
          day,
          domain: 'cardio',
          severity: 'warning',
          title: 'Cabin Ambient CO2 Elevation & Mild Hypercapnia',
          evidence: [
            { indicator: 'Cabin pCO2', z: 3.4, deltaPct: 227.0, windowDays: 1, weight: 0.60 },
            { indicator: 'Nocturnal Respiratory Rate', z: 2.8, deltaPct: 34.0, windowDays: 1, weight: 0.40 },
          ],
          likelyCause: 'ECLSS amine bed regeneration delay resulting in hab pCO2 accumulation to 0.74%.',
          confidence: 'high',
          status: 'open',
          actions: [
            { rank: 1, text: 'Inspect and manually switch ECLSS carbon scrub loop B.', escalate: true },
            { rank: 2, text: 'Increase personal habitat ventilation rate to maximum.', escalate: false },
            { rank: 3, text: 'Monitor crew for morning cephalalgia and orthostatic drift.', escalate: false },
          ],
        });
      }

      // Infection Alert
      if (day === 139 && crew.id === 'CREW-02') {
        alerts.push({
          id: `ALT-INF-D${day}-${crew.id}`,
          crewId: crew.id,
          day,
          domain: 'immune',
          severity: 'critical',
          title: 'Acute Systemic Pyrogenic & Immune Incursion',
          evidence: immuneContribs,
          likelyCause: 'Endogenous viral reactivation (EBV / VZV surrogate) under microgravity-induced T-cell suppression.',
          confidence: 'high',
          status: 'open',
          actions: [
            { rank: 1, text: 'Isolate crew member in crew quarters; initiate barrier nursing protocol.', escalate: true },
            { rank: 2, text: 'Collect saliva and blood droplet PCR swab for on-board diagnostic sequencer.', escalate: false },
            { rank: 3, text: 'Initiate targeted oral antiviral therapy and antipyretic relief.', escalate: true },
            { rank: 4, text: 'Temporarily excuse from heavy EVA and resistance training.', escalate: false },
          ],
        });
      }

      // Sleep Deprivation Alert
      if (day === 173 && (crew.id === 'CREW-01' || crew.id === 'CREW-02')) {
        alerts.push({
          id: `ALT-SLP-D${day}-${crew.id}`,
          crewId: crew.id,
          day,
          domain: 'behavioral',
          severity: 'warning',
          title: 'Circadian Desynchrony & Critical Sleep Debt',
          evidence: behavContribs,
          likelyCause: 'Continuous operational schedule overload during high-cadence orbital telemetry burn.',
          confidence: 'high',
          status: 'open',
          actions: [
            { rank: 1, text: 'Enforce mandatory 90-minute restorative sleep block prior to shift.', escalate: false },
            { rank: 2, text: 'Dim blue-wavelength cabin lighting in sleeping quarters to 480nm cutoff.', escalate: false },
            { rank: 3, text: 'Notify flight director to reassign non-critical operational tasks.', escalate: true },
          ],
        });
      }
    }
  }

  return {
    readings,
    events: scenario === 'none' ? Object.values(scenarioEvents) : [scenarioEvents[scenario]],
    result: {
      scores,
      alerts,
    },
  };
}
