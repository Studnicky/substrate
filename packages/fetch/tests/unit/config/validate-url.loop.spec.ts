import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';

import scenarioGroups from './validate-url.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: { shape: 'ok' }; input: { value: unknown }; shape: 'valid'; name: string }
  | { description: string; expected: { message: string }; input: { value: unknown }; shape: 'empty' | 'invalid' | 'non-string'; name: string };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type InvalidURLScenario = Extract<ScenarioCase, { shape: 'empty' | 'invalid' | 'non-string' }>;

function runInvalidURLScenario(scenarioCase: InvalidURLScenario): void {
  assert.throws(() => {
    Reflect.apply(FetchClient.create, FetchClient, [{ 'baseURL': scenarioCase.input.value }]);
  }, (error: Error) => {
    assert.ok(error.message.length > 0);
    return true;
  });
}

const runnerMap: RunnerMap = {
  'empty': runInvalidURLScenario,
  'invalid': runInvalidURLScenario,
  'non-string': runInvalidURLScenario,
  'valid': (scenarioCase) => {
    assert.doesNotThrow(() => {
      Reflect.apply(FetchClient.create, FetchClient, [{ 'baseURL': scenarioCase.input.value }]);
    });
  }
};

function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('validate url schema', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
