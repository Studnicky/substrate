import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NoOpTiming } from '../../src/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import scenarioGroups from './NoOpTiming.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { chainResult: true; durationMs: 0; sameInstance: true }; input: { event: Parameters<typeof TimingEvent.create>[0] }; shape: 'create-clear-event-get-events'; name: string }
  | { description: string; expected: { empty: true; durationMs: 0 }; input: Record<string, never>; shape: 'get-events-empty'; name: string };

function createTimingEvent(input: Parameters<typeof TimingEvent.create>[0]): ReturnType<typeof TimingEvent.create> {
  return TimingEvent.create(input);
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'create-clear-event-get-events': (scenarioCase) => {
    const timer = NoOpTiming.create();
    const afterEvent = timer.event(createTimingEvent(scenarioCase.input.event));
    const afterClear = timer.clear();
    const events = timer.getEvents();

    assert.strictEqual(afterEvent, undefined);
    assert.strictEqual(afterClear, timer);
    assert.strictEqual(scenarioCase.expected.chainResult, afterClear === timer);
    assert.strictEqual(events.durationMs, scenarioCase.expected.durationMs);
    assert.strictEqual(Object.keys(events).length, 1);
    assert.strictEqual(scenarioCase.expected.sameInstance, true);
  },

  'get-events-empty': (scenarioCase) => {
    const timer = NoOpTiming.create();
    const events = timer.getEvents();
    assert.deepStrictEqual(events, { durationMs: scenarioCase.expected.durationMs });
    assert.strictEqual(scenarioCase.expected.empty, true);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('NoOpTiming', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
