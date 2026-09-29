import { BaseError } from '@studnicky/types/browser';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RuntimeError } from '../../src/index.js';
import { RuntimeErrorScenarioCaseEntity } from './entities/RuntimeErrorScenarioCaseEntity.js';
import scenarioGroups from './runtime-error.scenarios.json' with { type: 'json' };

type ScenarioCase = RuntimeErrorScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(RuntimeErrorScenarioCaseEntity.Schema, RuntimeErrorScenarioCaseEntity.Node);

function createRuntimeError(input: ScenarioCase['input']): RuntimeError {
  const result = input.causeMessage === undefined
    ? RuntimeError.create(input.message)
    : RuntimeError.create(input.message, { 'cause': RuntimeError.create(input.causeMessage) });
  return result;
}

void describe('RuntimeError', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
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
