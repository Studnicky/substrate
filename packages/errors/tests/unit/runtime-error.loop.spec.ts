import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError, RuntimeError } from '../../src/index.js';
import scenarioGroups from './runtime-error.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  readonly 'description': string;
  readonly 'expected': {
    readonly 'code': string;
    readonly 'hasCause': boolean;
    readonly 'retryable': boolean;
  };
  readonly 'input': {
    readonly 'causeMessage'?: string;
    readonly 'message': string;
  };
  readonly 'name': string;
};

function createRuntimeError(input: ScenarioCase['input']): RuntimeError {
  const result = input.causeMessage === undefined
    ? RuntimeError.create(input.message)
    : RuntimeError.create(input.message, { 'cause': RuntimeError.create(input.causeMessage) });
  return result;
}

void describe('RuntimeError', () => {
  for (const scenario of scenarioGroups.cases as readonly ScenarioCase[]) {
    void it(scenario.name, () => {
      const error = createRuntimeError(scenario.input);
      assert.ok(error instanceof BaseError);
      assert.ok(error instanceof Error);
      assert.strictEqual(error.code, scenario.expected.code);
      assert.strictEqual(error.message, scenario.input.message);
      assert.strictEqual(error.retryable, scenario.expected.retryable);
      assert.strictEqual(error.cause instanceof Error, scenario.expected.hasCause);
      if (error.cause instanceof Error) {
        assert.strictEqual(error.cause.message, scenario.input.causeMessage);
      }
    });
  }
});
