import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassificationGuard } from '../../src/validation/isErrorClassification.js';
import scenarioGroups from './is-error-classification.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { result: boolean };
      input: unknown;
      kind: 'invalid-reason' | 'non-object' | 'valid' | 'valid-with-reason';
      name: string;
    };

type ScenarioRunner = (scenario: ScenarioCase) => void;

const runClassification: ScenarioRunner = (scenario) => {
  assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenario.input), scenario.expected.result);
};

const runnerMap = {
  'invalid-reason': runClassification,
  'non-object': runClassification,
  'valid': runClassification,
  'valid-with-reason': runClassification
} satisfies Record<ScenarioCase['kind'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.kind](scenario);
}

void describe('isErrorClassification', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
