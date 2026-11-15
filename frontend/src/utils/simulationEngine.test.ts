import test from 'node:test';
import assert from 'node:assert/strict';
import { generate200DaySimulation, calculateConcordance, DEFAULT_PROFILES } from './simulationEngine';
import { getRiskCategory, computeEvidenceContributors, generateAlertForDay } from './attributionEngine';

test('generates exactly 200 days of simulation data', () => {
  const sim = generate200DaySimulation(DEFAULT_PROFILES[0]);
  assert.equal(sim.length, 200);
  assert.equal(sim[0].day, 1);
  assert.equal(sim[199].day, 200);
});

test('ensures all risk scores are bounded strictly between 0 and 100', () => {
  const sim = generate200DaySimulation(DEFAULT_PROFILES[0]);
  for (const day of sim) {
    assert.ok(day.compositeRiskScore >= 0 && day.compositeRiskScore <= 100, `Day ${day.day} composite out of bounds`);
    for (const [, domain] of Object.entries(day.domainScores)) {
      assert.ok(domain.score >= 0 && domain.score <= 100, `Day ${day.day} domain ${domain.key} out of bounds: ${domain.score}`);
    }
  }
});

test('risk categories map correctly to clinical thresholds', () => {
  assert.equal(getRiskCategory(15), 'optimal');
  assert.equal(getRiskCategory(25), 'optimal');
  assert.equal(getRiskCategory(26), 'guarded');
  assert.equal(getRiskCategory(50), 'guarded');
  assert.equal(getRiskCategory(51), 'elevated');
  assert.equal(getRiskCategory(75), 'elevated');
  assert.equal(getRiskCategory(76), 'critical');
  assert.equal(getRiskCategory(100), 'critical');
});

test('evidence attribution contributors calculate valid weights and directions', () => {
  const sim = generate200DaySimulation(DEFAULT_PROFILES[0]);
  const peakDay = sim[135]; // Day 136 is near peak decompensation
  const contributors = computeEvidenceContributors('cardiovascular', peakDay.biomarkers, peakDay.domainScores.cardiovascular.score);

  assert.ok(contributors.length > 0);
  for (const contrib of contributors) {
    assert.ok(contrib.contributionPercent > 0);
    assert.ok(contrib.observedValue.length > 0);
    assert.ok(contrib.baselineValue.length > 0);
  }
});

test('alert generation properly triggers for high risk days and yields recommendations', () => {
  const sim = generate200DaySimulation(DEFAULT_PROFILES[0]);
  const alertDay = sim[135];
  const alert = generateAlertForDay(
    alertDay.day,
    alertDay.date,
    'cardiovascular',
    alertDay.domainScores.cardiovascular.score,
    alertDay.biomarkers
  );

  assert.ok(alert !== undefined);
  assert.ok(alert.contributors.length > 0);
  assert.ok(alert.recommendedActions.length >= 3);
  assert.ok(alert.severity === 'critical' || alert.severity === 'elevated');
});

test('concordance calculation accurately grades subjective vs objective agreement', () => {
  const sim = generate200DaySimulation(DEFAULT_PROFILES[0]);
  const lowRiskDay = sim[10]; // Composite ~ 15

  // User feeling great: average ~ 1.5 -> subjective score ~ 15
  const concordantCheckIn = {
    day: 11,
    timestamp: new Date().toISOString(),
    patientId: 'P-101',
    fatigueLevel: 1,
    cognitiveFog: 1,
    palpitations: 1,
    shortnessOfBreath: 1,
    muscleSoreness: 2,
    perceivedStress: 2,
    moodRating: 'optimal' as const,
    protocolAdherence: true,
    freeformNotes: 'Feeling rested and baseline normal',
  };

  const highMatch = calculateConcordance(concordantCheckIn, lowRiskDay);
  assert.equal(highMatch.label, 'High Agreement');
  assert.ok(highMatch.score >= 80);

  // User feeling terrible on a low-risk day -> Over-reporting
  const overReportCheckIn = {
    ...concordantCheckIn,
    fatigueLevel: 9,
    cognitiveFog: 9,
    palpitations: 8,
    shortnessOfBreath: 8,
    muscleSoreness: 9,
    perceivedStress: 9,
  };
  const discordance = calculateConcordance(overReportCheckIn, lowRiskDay);
  assert.equal(discordance.label, 'Subjective Over-Reporting');
});
