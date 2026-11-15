// src/lib/risk.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMissionData } from './mock/generator';
import { predict72hRisk, calculateSlope } from './risk';

test('calculateSlope returns accurate linear regression slope', () => {
  const flat = [5, 5, 5, 5];
  assert.equal(calculateSlope(flat), 0);

  const rising = [1, 2, 3, 4, 5];
  assert.equal(calculateSlope(rising), 1);

  const falling = [10, 8, 6, 4, 2];
  assert.equal(calculateSlope(falling), -2);
});

test('predict72hRisk outputs bounded scores (0-100) and mandatory disclaimer', () => {
  const { readings } = generateMissionData('sleep');
  const riskProfile = predict72hRisk('CREW-01', 173, readings);

  assert.equal(riskProfile.crewId, 'CREW-01');
  assert.equal(riskProfile.day, 173);
  assert.ok(riskProfile.overall72hRisk >= 0 && riskProfile.overall72hRisk <= 100);
  assert.equal(riskProfile.disclaimer, 'Estimated trend-based risk, not a diagnosis.');
  assert.equal(riskProfile.categories.length, 3);

  for (const cat of riskProfile.categories) {
    assert.ok(cat.riskScore >= 0 && cat.riskScore <= 100);
    assert.equal(cat.horizon, '72 h');
    assert.equal(cat.disclaimer, 'Estimated trend-based risk, not a diagnosis.');
    assert.ok(['increasing', 'stable', 'decreasing'].includes(cat.trendDirection));
  }
});
