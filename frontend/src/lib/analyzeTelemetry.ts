import type { Alert, Contribution, CrewMember, Domain, DomainScore, MissionResult, Reading, SpaceEvent, TelemetryMetric } from '../shared/types';

const domainNames: Record<Domain, string> = {
  cardio: 'Cardiovascular',
  immune: 'Temperature',
  bone_muscle: 'Bone and muscle',
  behavioral: 'Behavioral and sleep',
  radiation: 'Radiation',
};

function compare(indicator: string, value: number, baseline: number, spread: number, weight: number): Contribution {
  return {
    indicator,
    z: Number(((value - baseline) / spread).toFixed(2)),
    deltaPct: Number(((value - baseline) / baseline * 100).toFixed(1)),
    windowDays: 1,
    weight,
  };
}

function domainScore(
  reading: Reading,
  domain: Domain,
  value: number,
  contributors: Contribution[],
  confidence: number,
): DomainScore {
  const score = Math.max(0, Math.min(100, Math.round(value)));
  return {
    crewId: reading.crewId,
    day: reading.day,
    domain,
    score,
    band: score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red',
    contributors,
    confidence,
  };
}

function scoreReading(reading: Reading, crew: CrewMember): DomainScore[] {
  function metric(key: TelemetryMetric, label: string, baseline: number, spread: number, weight: number) {
    return compare(
      label,
      reading[key] ?? crew.baselines[key] ?? baseline,
      crew.baselines[key] ?? baseline,
      crew.spreads?.[key] ?? spread,
      weight,
    );
  }

  const hr = metric('restingHr', 'Resting Heart Rate', 60, 4.5, 0.35);
  const hrv = metric('hrv', 'HRV (rMSSD)', 55, 7, 0.45);
  const sbp = metric('sbp', 'Systolic Blood Pressure', 115, 6, 0.2);
  const temperature = metric('coreTemp', 'Core Body Temperature', 36.6, 0.25, 1);
  const exercise = metric('exerciseMin', 'Daily Exercise', 75, 15, 0.25);
  const grip = metric('gripKg', 'Grip Strength', 42, 2, 0.4);
  const bone = metric('boneMarker', 'Bone Marker', 20, 2, 0.35);
  const sleep = metric('sleepHours', 'Sleep Duration', 7, 0.8, 0.55);
  const stress = metric('stress', 'Subjective Stress', 3, 1.5, 0.3);
  const reaction = metric('reactionMs', 'Reaction Time', 250, 30, 0.15);
  const dose = compare('Daily Absorbed Dose', reading.doseMsv, 1.84, 1.5, 1);

  return [
    domainScore(reading, 'cardio', 92 - Math.max(0, hr.z) * 6.5 + Math.min(0, hrv.z) * 8.5, [hrv, hr, sbp], 0.94),
    domainScore(reading, 'immune', 94 - Math.max(0, temperature.z) * 18, [temperature], 0.91),
    domainScore(reading, 'bone_muscle', 90 + Math.min(0, exercise.z) * 6 + Math.min(0, grip.z) * 4
      + Math.min(0, bone.z) * 3, [grip, bone, exercise], 0.88),
    domainScore(reading, 'behavioral', 92 + Math.min(0, sleep.z) * 12 - Math.max(0, stress.z) * 8
      - Math.max(0, reaction.z) * 3, [sleep, stress, reaction], 0.93),
    domainScore(reading, 'radiation', 96 - Math.max(0, reading.doseMsv - 1.84) * 2.8, [dose], 0.98),
  ];
}

export function analyzeTelemetry(readings: Reading[], crew: CrewMember[], events: SpaceEvent[]): MissionResult {
  const byId = new Map(crew.map((member) => [member.id, member]));
  const scores: DomainScore[] = [];
  const alerts: Alert[] = [];

  for (const reading of readings) {
    const profile = byId.get(reading.crewId);
    if (!profile) continue;

    for (const score of scoreReading(reading, profile)) {
      scores.push(score);
      if (score.band === 'green') continue;

      const activeEvent = events.find((event) => event.startDay <= score.day && event.endDay >= score.day
        && (!event.crewIds?.length || event.crewIds.includes(score.crewId)));
      const eventLabel = activeEvent?.title ?? activeEvent?.type.replaceAll('_', ' ');
      alerts.push({
        id: `TELEMETRY-${score.crewId}-${score.day}-${score.domain}`,
        crewId: score.crewId,
        day: score.day,
        domain: score.domain,
        severity: score.band === 'red' ? 'critical' : 'warning',
        title: `${domainNames[score.domain]} telemetry deviation`,
        evidence: score.contributors,
        likelyCause: eventLabel
          ? `A telemetry threshold was crossed during the ${eventLabel} scenario.`
          : 'A telemetry threshold was crossed relative to the simulation baseline.',
        confidence: 'low',
        actions: [],
        status: 'open',
      });
    }
  }

  return { scores, alerts };
}
