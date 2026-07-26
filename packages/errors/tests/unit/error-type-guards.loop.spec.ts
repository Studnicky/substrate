import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { errorTypeGuards } from '../../src/validation/errorTypeGuards.js';
import scenarioGroups from './error-type-guards.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { result: boolean };
  input: { error: unknown; guard: keyof typeof errorTypeGuards };
  name: string;
};

function materializeError(error: unknown): unknown {
  if (error !== null && typeof error === 'object' && 'shape' in error && (error as { shape?: string }).shape === 'native-error') {
    const nativeError = new Error('native error');
    Object.assign(nativeError, error);
    delete (nativeError as { shape?: unknown }).shape;
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
