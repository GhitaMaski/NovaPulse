import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocalMission, loadBackendMission } from './dataSource';

test('API mission uses the returned crew, telemetry and event data', async ({ mock }) => {
  const offline = getLocalMission('none');
  const missionCrew = { ...offline.crew[0], name: 'API crew member' };
  const responseByRoute = new Map<string, unknown>([
    ['/api/v1/mission', { startDate: '2024-02-01', totalDays: 200 }],
    ['/api/v1/crew', [missionCrew]],
    ['/api/v1/readings', [{
      ...offline.readings[0],
      date: undefined,
      cabinCo2: 650,
      coreTemp: missionCrew.baselines.coreTemp + 1.5,
      stress: 5,
    }]],
    ['/api/v1/events', [{
      id: 'fixture-event', type: 'sleep_disruption', source: 'injected',
      startDay: 1, endDay: 1, details: 'Test event description',
    }]],
  ]);
  mock.method(globalThis, 'fetch', async (url: string) => (
    Response.json(responseByRoute.get(url))
  ));

  const mission = await loadBackendMission();

  assert.equal(mission.crew[0].name, 'API crew member');
  assert.equal(mission.readings[0].date, '2024-02-01');
  assert.equal(mission.readings[0].stress, 10);
  assert.equal(mission.readings[0].cabinCo2, 0.065);
  assert.equal(mission.events[0].description, 'Test event description');
  assert.equal(mission.events[0].source, 'injected');
  assert.equal(mission.result.scores.length, 5);
  assert.equal(mission.result.scores.find(({ domain }) => domain === 'immune')?.band, 'red');
  assert.ok(mission.result.alerts.some(({ domain, actions }) => domain === 'immune' && actions.length === 0));
});
