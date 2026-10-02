import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';

import { RuntimeError } from '../../src/index.js';
import { RuntimeErrorScenarioCaseEntity } from './entities/RuntimeErrorScenarioCaseEntity.js';
import scenarioGroups from './runtime-error.scenarios.json' with { 'type': 'json' };

class RuntimeErrorRunners {
  static 'basic'(scenarioCase: ScenarioCaseOfType<RuntimeErrorScenarioCaseEntity.Type, 'basic'>): void {
    const error = RuntimeErrorRunners.createRuntimeError(scenarioCase.input);
    assert.ok(error instanceof BaseError);
    assert.ok(error instanceof Error);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.input.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.cause instanceof Error, scenarioCase.expected.hasCause);
    if (error.cause instanceof Error) {
      assert.strictEqual(error.cause.message, scenarioCase.input.causeMessage);
    }
  }

  private static createRuntimeError(input: RuntimeErrorScenarioCaseEntity.Type['input']): RuntimeError {
    const result = input.causeMessage === undefined
      ? RuntimeError.create(input.message)
      : RuntimeError.create(input.message, { 'cause': RuntimeError.create(input.causeMessage) });
    return result;
  }
}

ScenarioSuite.register({
  'entity': RuntimeErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'RuntimeError',
  'runners': RuntimeErrorRunners
});
