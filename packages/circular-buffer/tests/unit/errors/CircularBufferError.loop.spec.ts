import assert from 'node:assert/strict';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { CircularBufferError } from '../../../src/errors/CircularBufferError.js';
import { CircularBufferErrorScenarioCaseEntity } from '../entities/CircularBufferErrorScenarioCaseEntity.js';
import scenarioGroups from './CircularBufferError.scenarios.json' with { 'type': 'json' };

class CircularBufferErrorRunners {
  static assertBaseError(error: CircularBufferError, scenarioCase: CircularBufferErrorScenarioCaseEntity.Type): void {
    assert.equal(error.name, 'CircularBufferError');
    assert.equal(error.code, scenarioCase.expected.code);
    assert.equal(error.message, scenarioCase.expected.message);
    assert.equal(error.retryable, scenarioCase.expected.retryable);
  }

  static assertOptionalProperties(error: CircularBufferError, scenarioCase: CircularBufferErrorScenarioCaseEntity.Type): void {
    const correlationId = scenarioCase.expected.correlationId;
    if (correlationId === undefined) {
      assert.equal(error.correlationId, undefined);
    } else {
      assert.equal(error.correlationId, ScenarioValues.requireString(correlationId, 'expected.correlationId'));
    }
    const metadata = scenarioCase.expected.metadata;
    if (metadata === undefined) {
      assert.equal(error.metadata, undefined);
    } else {
      assert.deepStrictEqual(error.metadata, ScenarioValues.requireRecord(metadata, 'expected.metadata'));
    }
  }

  static 'default-construction'(scenarioCase: CircularBufferErrorScenarioCaseEntity.Type): void {
    const error = new CircularBufferError(scenarioCase.input.message);
    CircularBufferErrorRunners.assertBaseError(error, scenarioCase);
    assert.equal(error.cause, undefined);
  }

  static 'with-args'(scenarioCase: CircularBufferErrorScenarioCaseEntity.Type): void {
    const error = new CircularBufferError(scenarioCase.input.message, scenarioCase.input.args);
    CircularBufferErrorRunners.assertBaseError(error, scenarioCase);
    CircularBufferErrorRunners.assertOptionalProperties(error, scenarioCase);
  }

  static 'with-cause'(scenarioCase: CircularBufferErrorScenarioCaseEntity.Type): void {
    const error = new CircularBufferError(scenarioCase.input.message, scenarioCase.input.args);
    CircularBufferErrorRunners.assertBaseError(error, scenarioCase);
    CircularBufferErrorRunners.assertOptionalProperties(error, scenarioCase);
    assert.equal(error.cause === scenarioCase.input.args?.cause, true);
  }
}

ScenarioSuite.register({
  'entity': CircularBufferErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircularBufferError',
  'runners': CircularBufferErrorRunners
});
