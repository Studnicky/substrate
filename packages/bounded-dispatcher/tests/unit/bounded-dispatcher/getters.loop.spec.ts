import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/index.js';

import { BoundedDispatcher } from '../../../src/index.js';

type ScenarioCase =
  | { name: string; description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'getBus-default' }
  | { name: string; description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'getBus-preserves-instance' };

import scenarioGroups from './getters.scenarios.json';

type ScenarioRunner = (scenario: ScenarioCase) => void;

const runnerMap: Record<ScenarioCase['kind'], ScenarioRunner> = {
  'getBus-default': (scenario) => {
    const dispatcher = BoundedDispatcher.create();
    const { expected, input } = scenario;
    assert.ok(dispatcher.getBus() instanceof EventBus);
    assert.strictEqual(dispatcher.getBus().constructor.name, String(expected.busKind));
    assert.strictEqual(input.busKind, expected.busKind);
  },
  'getBus-preserves-instance': (scenario) => {
    const bus = EventBus.create<BoundedDispatcherTopicMapInterface>();
    const { expected, input } = scenario;
    const dispatcher = BoundedDispatcher.create({ bus });
    assert.strictEqual(dispatcher.getBus(), bus);
    assert.strictEqual(Boolean(expected.sameInstance), true);
    assert.strictEqual(Boolean(input.sameInstance), true);
  }
};

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.kind](scenario);
}

void describe('BoundedDispatcher getBus()', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario as ScenarioCase);
    });
  }
});
