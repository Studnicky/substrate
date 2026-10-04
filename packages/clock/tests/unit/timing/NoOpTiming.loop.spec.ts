import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { NoOpTiming } from '../../../src/timing/index.js';
import { TimingEvent } from '../../../src/timing/modules/TimingEvent.js';
import { NoOpTimingScenarioCaseEntity } from './entities/NoOpTimingScenarioCaseEntity.js';
import scenarioGroups from './NoOpTiming.scenarios.json' with { 'type': 'json' };

class NoOpTimingRunners {
  static 'create-clear-event-get-events'(
    scenarioCase: ScenarioCaseOfType<
      NoOpTimingScenarioCaseEntity.Type,
      'create-clear-event-get-events'
    >
  ): void {
    const timer = NoOpTiming.create();
    const afterEvent = timer.event(TimingEvent.create(scenarioCase.input.event));
    const afterClear = timer.clear();
    const events = timer.getEvents();

    assert.strictEqual(afterEvent, undefined);
    assert.strictEqual(afterClear, timer);
    assert.strictEqual(scenarioCase.expected.chainResult, afterClear === timer);
    assert.strictEqual(events.get('durationMs'), scenarioCase.expected.durationMs);
    assert.strictEqual([...events.keys()].length, 1);
    assert.strictEqual(scenarioCase.expected.sameInstance, true);
  }

  static 'get-events-empty'(
    scenarioCase: ScenarioCaseOfType<NoOpTimingScenarioCaseEntity.Type, 'get-events-empty'>
  ): void {
    const timer = NoOpTiming.create();
    const events = timer.getEvents();
    assert.deepStrictEqual(events, new Map([['durationMs', scenarioCase.expected.durationMs]]));
    assert.strictEqual(scenarioCase.expected.empty, true);
  }
}

ScenarioSuite.register({
  'entity': NoOpTimingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'NoOpTiming',
  'runners': NoOpTimingRunners
});
