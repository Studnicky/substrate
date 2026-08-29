import { RuntimeError } from '../../src/errors/RuntimeError.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { errorTypeGuards } from '../../src/validation/errorTypeGuards.js';
import scenarioGroups from './error-type-guards.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { result: boolean };
  input: { error: ErrorFixture; guard: keyof typeof errorTypeGuards };
  name: string;
};

type ErrorFixture = string | Record<string, number | string>;

function materializeError(error: ErrorFixture): ErrorFixture | Error {
  if (error !== null && typeof error === 'object' && 'shape' in error && (error as { shape?: string }).shape === 'native-error') {
    const nativeError = RuntimeError.create('native error');
    Object.assign(nativeError, error);
    Reflect.deleteProperty(nativeError, 'shape');
    return nativeError;
  }

  return error;
}

function runCase(scenarioCase: ScenarioCase): void {
  const guard = errorTypeGuards[scenarioCase.input.guard];
  const result = guard(materializeError(scenarioCase.input.error));
  assert.strictEqual(result, scenarioCase.expected.result);
}

void describe('error type guards', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
