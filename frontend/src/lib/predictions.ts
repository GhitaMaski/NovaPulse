import type { Reading } from '../shared/types';

// Values for the manual example and for model inputs the simulator does not provide.
export const example = {
  recovery_score: 0.45,
  recovery_trend: 0.05,
  cardiac_state: 0.4,
  hr_variability: 0.55,
  activity_score: 0.6,
  activity_change: 0.2,
  stress_index: 0.35,
  stress_variability: 0.2,
  cognitive_load: 0.4,
  alpha_beta_ratio: 0.6,
  theta_alpha_ratio: 0.5,
  gsr_variability: 0.3,
  resp_variability: 0.2,
  has_recovery_data: 1,
  has_activity_data: 1,
  has_eeg_data: 0,
  has_gsr_data: 0,
  has_resp_data: 0,
  source_encoded: 0,
  mission_day: 103,
  heart_rate: 80.349297,
  spo2: 96.0323,
  body_temperature: 37.010268,
  systolic_bp: 120.165866,
  diastolic_bp: 73.827558,
  sleep_hours: 5.694519,
  sleep_quality: 71.535983,
  sleep_efficiency: 73.498882,
  sleep_debt: 2.305481,
  cabin_co2: 0.057731,
  microgravity_days: 103,
  muscle_loss_index: 0.207597,
  bone_density_risk: 0.143953,
  radiation_dose: 77.754077,
  radiation_risk: 0.25918,
};

export type PredictionInput = typeof example;
type ModelReading = Pick<Reading, 'crewId' | 'day' | 'restingHr' | 'hrv' | 'sbp' | 'dbp'
  | 'spo2' | 'coreTemp' | 'sleepHours' | 'sleepEff' | 'exerciseMin' | 'stress' | 'doseMsv' | 'cabinCo2'>;

export interface PredictionResult {
  health_score: number;
  fatigue_risk: number;
  cardio_risk: number;
  sleep_risk: number;
  mission_status: string;
  anomaly: string;
}

export type PredictionLookup = Readonly<Record<string, PredictionResult | undefined>>;

export function predictionKey(crewId: string, day: number) {
  return `${crewId}:${day}`;
}

function scale(value: number, min: number, max: number) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function preparePredictionRows(readings: ModelReading[]) {
  const previous = new Map<string, { dose: number; recovery: number }>();

  return [...readings].sort((a, b) => a.day - b.day).map((reading) => {
    const { crewId, day, restingHr, hrv, sleepEff, sleepHours, stress } = reading;
    const prior = previous.get(crewId);
    const dose = (prior?.dose ?? 0) + reading.doseMsv;
    // Use the simulator's telemetry to approximate the normalized training inputs.
    const variability = scale(hrv, 14, 110);
    const recovery = 0.4 * scale(sleepHours, 3, 10) + 0.3 * scale(sleepEff, 0, 100) + 0.3 * variability;
    previous.set(crewId, { dose, recovery });

    const input: PredictionInput = {
      ...example,
      recovery_score: recovery,
      recovery_trend: Math.abs(recovery - (prior?.recovery ?? recovery)),
      cardiac_state: 0.5 * (1 - scale(restingHr, 50, 110)) + 0.5 * variability,
      hr_variability: variability,
      activity_score: scale(reading.exerciseMin, 0, 120),
      stress_index: stress == null ? example.stress_index : scale(stress, 1, 10),
      mission_day: day,
      heart_rate: restingHr,
      spo2: reading.spo2,
      body_temperature: reading.coreTemp,
      systolic_bp: reading.sbp,
      diastolic_bp: reading.dbp,
      sleep_hours: sleepHours,
      // Efficiency is on the same 0–100 scale as the unmeasured sleep quality.
      sleep_quality: sleepEff,
      sleep_efficiency: sleepEff,
      sleep_debt: Math.max(0, 8 - sleepHours),
      cabin_co2: reading.cabinCo2,
      microgravity_days: day,
      muscle_loss_index: scale(day, 0, 500),
      bone_density_risk: scale(day, 0, 700),
      radiation_dose: Number(dose.toFixed(2)),
      radiation_risk: scale(dose, 0, 300),
    };
    return { key: predictionKey(crewId, day), input };
  });
}

class PredictionApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function predictionRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/predict${path}`, options);
  if (response.ok) return response.json();

  const body = await response.json().catch(() => null);
  const apiError = body?.error;
  const message = apiError?.message ?? body?.detail;
  const fields = Array.isArray(apiError?.fields) ? apiError.fields : [];
  throw new PredictionApiError(
    typeof message === 'string' ? [message, ...fields].join('\n') : `Prediction API returned HTTP ${response.status}.`,
    response.status,
  );
}

export async function predictScenario(readings: Reading[], isCurrent: () => boolean): Promise<PredictionLookup> {
  const rows = preparePredictionRows(readings);
  const body = JSON.stringify({ readings: rows.map(({ input }) => input) });
  for (let attempt = 0; isCurrent(); attempt++) {
    try {
      const results = await predictionRequest<PredictionResult[]>('/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      if (!Array.isArray(results) || results.length !== rows.length) {
        throw new Error('The API returned incomplete scenario predictions.');
      }
      return Object.fromEntries(rows.map(({ key }, index) => [key, results[index]]));
    } catch (error) {
      if (!(error instanceof PredictionApiError && error.status === 429) || attempt >= 9) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  return {};
}
