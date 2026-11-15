import assert from 'node:assert/strict';
import test from 'node:test';
import { useMissionStore } from '../stores/useMissionStore';
import { predictionKey, type PredictionInput } from './predictions';
import { getAstronautHealth } from './selectors';

test('each scenario launch sends all readings and shares model results by astronaut and day', async ({ mock }) => {
  const batches: PredictionInput[][] = [];
  mock.method(globalThis, 'fetch', async (path: string, options: RequestInit) => {
    assert.equal(path, '/api/v1/predict/batch');
    assert.equal(options.method, 'POST');
    const { readings } = JSON.parse(String(options.body)) as { readings: PredictionInput[] };
    batches.push(readings);
    return Response.json(readings.map((reading) => ({
      health_score: reading.sleep_efficiency,
      fatigue_risk: 0.2,
      cardio_risk: 0.1,
      sleep_risk: 1 - reading.sleep_quality / 100,
      mission_status: 'WARNING',
      anomaly: 'Normal',
    })));
  });

  await useMissionStore.getState().triggerScenario('sleep');
  const state = useMissionStore.getState();
  const results = state.scenarioPrediction.results;
  assert.equal(batches[0].length, 600);
  assert.equal(Object.keys(results ?? {}).length, 600);
  assert.equal(state.currentDay, 173);
  assert.equal(state.events.length, 1);

  const day173 = state.readings.find((reading) => reading.crewId === 'CREW-01' && reading.day === 173);
  assert.ok(day173);
  assert.equal(batches[0][(173 - 1) * 3].sleep_quality, day173.sleepEff);
  const health = getAstronautHealth('CREW-01', 173, state.result.scores, state.crew, results);
  assert.equal(health.score, day173.sleepEff);
  assert.equal(health.band, 'amber');
  assert.notEqual(health.prediction?.sleep_risk, results?.[predictionKey('CREW-01', 160)]?.sleep_risk);
  assert.notEqual(health.prediction?.sleep_risk, results?.[predictionKey('CREW-03', 173)]?.sleep_risk);

  state.setCurrentDay(160);
  state.setSelectedCrewId('CREW-03');
  assert.equal(batches.length, 1);
  await state.triggerScenario('sleep');
  assert.equal(batches.length, 2);
  await state.triggerScenario('co2');
  assert.equal(batches.length, 3);
  assert.ok(batches[2].some((input) => input.mission_day === 99 && input.cabin_co2 > 0.7));
});
