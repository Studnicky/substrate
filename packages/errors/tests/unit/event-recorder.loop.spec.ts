import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventRecorder } from '../../src/index.js';
import { EventRecorderScenarioCaseEntity } from './entities/EventRecorderScenarioCaseEntity.js';
import scenarioGroups from './event-recorder.scenarios.json' with { type: 'json' };

interface RecordedEventInterface {
  shape: string;
  nested: { value: number };
}

type ScenarioCase = EventRecorderScenarioCaseEntity.Type;
type ScenarioRunner = (scenario: ScenarioCase) => void;

const fileIntake = ScenarioFileCompiler.compileIntake(EventRecorderScenarioCaseEntity.Schema, EventRecorderScenarioCaseEntity.Node);

function runCase(scenario: ScenarioCase): void {
  scenarioRunners[scenario.shape](scenario);
}

const scenarioRunners = {
  'detaches-recorded-events': (scenario) => {
    const { expected, input } = scenario;
    const recorder = new EventRecorder<RecordedEventInterface>();
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
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

void describe('EventRecorder', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
