import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/interfaces/index.js';

import { BoundedDispatcher } from '../../../src/index.js';
import { GettersScenarioCaseEntity } from '../entities/GettersScenarioCaseEntity.js';

import scenarioGroups from './getters.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(GettersScenarioCaseEntity.Schema, GettersScenarioCaseEntity.Node);

type ScenarioCase = GettersScenarioCaseEntity.Type;
type ScenarioRunner = (scenario: ScenarioCase) => void;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'getBus-default': (scenario) => {
    const dispatcher = BoundedDispatcher.create();
    const { expected, input } = scenario;
    assert.ok(dispatcher.getBus() instanceof EventBus);
    assert.strictEqual(dispatcher.getBus().constructor.name, String(expected.busShape));
    assert.strictEqual(input.busShape, expected.busShape);
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
  runnerMap[scenario.shape](scenario);
}

void describe('BoundedDispatcher getBus()', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
