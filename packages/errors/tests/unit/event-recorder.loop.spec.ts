import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventRecorder } from '../../src/index.js';
import scenarioGroups from './event-recorder.scenarios.json';

interface RecordedEventInterface {
  shape: string;
  nested: { value: number };
}

type ScenarioShape = 'detaches-recorded-events';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: { recorder: { event: RecordedEventInterface } };
  shape: ScenarioShape;
  name: string;
};

function runCase(scenario: ScenarioCase): void {
  scenarioRunners[scenario.shape](scenario);
}

type ScenarioRunner = (scenario: ScenarioCase) => void;

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
} satisfies Record<ScenarioShape, ScenarioRunner>;

void describe('EventRecorder', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
