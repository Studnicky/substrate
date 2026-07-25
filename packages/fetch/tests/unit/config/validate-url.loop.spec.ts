import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidateURL } from '../../../src/config/schemas/validateURL.js';

import scenarioGroups from './validate-url.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { kind: 'ok' }; input: { value: unknown }; kind: 'valid'; name: string }
  | { description: string; expected: { message: string }; input: { value: unknown }; kind: 'empty' | 'invalid' | 'non-string'; name: string };

type ScenarioRunner<Kind extends ScenarioCase['kind']> = (scenarioCase: Extract<ScenarioCase, { kind: Kind }>) => void;
type RunnerMap = { [Kind in ScenarioCase['kind']]: ScenarioRunner<Kind> };
type InvalidURLScenario = Extract<ScenarioCase, { kind: 'empty' | 'invalid' | 'non-string' }>;

function runInvalidURLScenario(scenarioCase: InvalidURLScenario): void {
  assert.throws(() => {
    ValidateURL.validate(scenarioCase.input.value);
  }, (error: Error) => {
    assert.equal(error.message, scenarioCase.expected.message);
    return true;
  });
}

const runnerMap: RunnerMap = {
  'empty': runInvalidURLScenario,
  'invalid': runInvalidURLScenario,
  'non-string': runInvalidURLScenario,
  'valid': (scenarioCase) => {
    assert.doesNotThrow(() => {
      ValidateURL.validate(scenarioCase.input.value);
    });
  }
};

function runCase<Kind extends ScenarioCase['kind']>(scenarioCase: Extract<ScenarioCase, { kind: Kind }>): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('validate url schema', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
