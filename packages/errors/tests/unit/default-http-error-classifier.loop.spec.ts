import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DefaultHttpErrorClassifier } from '../../src/classifiers/DefaultHttpErrorClassifier.js';
import { ErrorWithStatusEntity } from '../../src/entities/ErrorWithStatusEntity.js';
import scenarioGroups from './default-http-error-classifier.scenarios.json';

type ScenarioCase =
  | {
      attemptNumber: number;
      description: string;
      expected: { reason: string; retryable: boolean };
      input: Record<string, unknown>;
      shape: 'client-error' | 'gateway-error' | 'network-code' | 'network-message' | 'rate-limited' | 'request-timeout' | 'server-error' | 'unknown-early' | 'unknown-late';
      name: string;
    };

function createError(input: Record<string, unknown>): Error {
  const error = new Error(String(input.message ?? ''));
  for (const [key, value] of Object.entries(input)) {
    Reflect.set(error, key, value);
  }
  return error;
}

function runCase(scenario: ScenarioCase): void {
  const classifier = DefaultHttpErrorClassifier.create();
  const error = createError(scenario.input);
  const classification = classifier.classify(error, scenario.attemptNumber);

  assert.deepStrictEqual(classification, scenario.expected);
  assert.strictEqual(ErrorWithStatusEntity.validate(error), 'status' in scenario.input ? true : false);
}

void describe('DefaultHttpErrorClassifier', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
