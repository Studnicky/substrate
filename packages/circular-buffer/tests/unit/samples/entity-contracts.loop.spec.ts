import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { SampleBufferStateEntity } from '../../../src/entities/index.js';
import { SampleBufferError } from '../../../src/errors/SampleBufferError.js';
import { SampleBufferStateScenarioCaseEntity } from '../entities/SampleBufferStateScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { 'type': 'json' };

class SampleBufferStateRunners {
  static 'error-args'(
    scenarioCase: ScenarioCaseOfType<SampleBufferStateScenarioCaseEntity.Type, 'error-args'>
  ): void {
    const error = new SampleBufferError(scenarioCase.input.message, {
      'cause': RuntimeError.create(scenarioCase.input.causeMessage),
      'correlationId': scenarioCase.input.correlationId,
      ...(scenarioCase.input.retryable === undefined
        ? {}
        : { 'retryable': scenarioCase.input.retryable })
    });
    assert.equal(error.message, scenarioCase.expected.message);
    assert.equal(error.correlationId, scenarioCase.expected.correlationId);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
    assert.ok(error.cause instanceof Error);
    assert.equal(error.cause.message, scenarioCase.expected.causeMessage);
  }

  static 'invalid-length'(
    scenarioCase: ScenarioCaseOfType<SampleBufferStateScenarioCaseEntity.Type, 'invalid-length'>
  ): void {
    SampleBufferStateRunners.assertValidations(scenarioCase);
  }

  static 'valid-state'(
    scenarioCase: ScenarioCaseOfType<SampleBufferStateScenarioCaseEntity.Type, 'valid-state'>
  ): void {
    SampleBufferStateRunners.assertValidations(scenarioCase);
  }

  private static assertValidations(
    scenarioCase: ScenarioCaseOfType<
      SampleBufferStateScenarioCaseEntity.Type,
      'invalid-length' | 'valid-state'
    >
  ): void {
    const results: boolean[] = [];
    const validations = scenarioCase.input.validations;
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      assert.ok(validation !== undefined);
      const result = SampleBufferStateEntity.validate(validation.value);
      assert.equal(result, validation.expected);
      results.push(result);
    }

    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  }
}

ScenarioSuite.register({
  'entity': SampleBufferStateScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'SampleBufferStateEntity',
  'runners': SampleBufferStateRunners
});
