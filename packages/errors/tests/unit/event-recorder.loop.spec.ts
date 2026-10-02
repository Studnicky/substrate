import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { EventRecorder } from '../../src/index.js';
import { EventRecorderScenarioCaseEntity } from './entities/EventRecorderScenarioCaseEntity.js';
import scenarioGroups from './event-recorder.scenarios.json' with { 'type': 'json' };

class EventRecorderRunners {
  static 'detaches-recorded-events'(scenarioCase: ScenarioCaseOfType<EventRecorderScenarioCaseEntity.Type, 'detaches-recorded-events'>): void {
    const { expected, input } = scenarioCase;
    const recorder = new EventRecorder<EventRecorderScenarioCaseEntity.Type['input']['recorder']['event']>();
    const source = input.recorder.event;

    recorder.record(source, 'request');
    source.nested.value = 2;

    const firstProjection = recorder.events;
    assert.strictEqual(firstProjection.length, 1);
    assert.deepStrictEqual(firstProjection[0], expected.firstProjection);

    const firstEvent = firstProjection[0];
    if (firstEvent !== undefined) {
      firstEvent.nested.value = 3;
    }

    assert.deepStrictEqual(recorder.events[0], expected.detachedProjection);
  }
}

ScenarioSuite.register({
  'entity': EventRecorderScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'EventRecorder',
  'runners': EventRecorderRunners
});
