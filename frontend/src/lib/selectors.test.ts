// src/lib/selectors.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMissionData } from './mock/generator';
import { getCrewHealthIndex, getAstronautHealth, getAnomalies, getAlertExplanation } from './selectors';

test('mock generator produces deterministic 200 days for 3 crew members', () => {
  const data1 = generateMissionData('none');
  const data2 = generateMissionData('none');

  assert.equal(data1.readings.length, 600); // 200 days * 3 crew
  assert.equal(data1.result.scores.length, 3000); // 200 days * 3 crew * 5 domains
  assert.equal(data1.readings[0].restingHr, data2.readings[0].restingHr);
  assert.equal(data1.result.scores[0].score, data2.result.scores[0].score);
});

test('values are within realistic physiological spacecraft ranges', () => {
  const { readings, result } = generateMissionData('none');
  for (const r of readings) {
    assert.ok(r.restingHr >= 40 && r.restingHr <= 120, `HR out of range: ${r.restingHr}`);
    assert.ok(r.spo2 >= 90 && r.spo2 <= 100, `SpO2 out of range: ${r.spo2}`);
    assert.ok(r.coreTemp >= 35.5 && r.coreTemp <= 40.0, `Core temp out of range: ${r.coreTemp}`);
    assert.ok(r.sleepHours >= 1 && r.sleepHours <= 12, `Sleep out of range: ${r.sleepHours}`);
  }

  for (const s of result.scores) {
    assert.ok(s.score >= 0 && s.score <= 100, `Domain score out of range: ${s.score}`);
    assert.ok(['green', 'amber', 'red'].includes(s.band));
  }
});

test('crew health index derives correctly as crew average and assigns mission status', () => {
  const { result } = generateMissionData('none');
  const chi = getCrewHealthIndex(1, result.scores);

  assert.ok(chi.index >= 0 && chi.index <= 100);
  assert.equal(chi.astronauts.length, 3);
  assert.ok(['green', 'amber', 'red'].includes(chi.missionStatus));
});

test('anomalies filter |z| >= 2 correctly', () => {
  const { readings, result } = generateMissionData('infection');
  const anomaliesDay139 = getAnomalies(139, result.scores, readings);

  for (const a of anomaliesDay139) {
    assert.ok(Math.abs(a.z) >= 2.0);
    assert.ok(['Low', 'Medium', 'High'].includes(a.severityLabel));
  }
});

test('AI explanation formats evidence sorted by impact score', () => {
  const { result } = generateMissionData('none');
  const alert = result.alerts[0];
  assert.ok(alert, 'Alert must exist in mock data');

  const explanation = getAlertExplanation(alert);
  assert.equal(explanation.alertId, alert.id);
  assert.ok(explanation.confidencePct > 0);
  assert.ok(explanation.factors.length > 0);
  for (let i = 0; i < explanation.factors.length - 1; i++) {
    assert.ok(explanation.factors[i].impactScore >= explanation.factors[i + 1].impactScore);
  }
});
