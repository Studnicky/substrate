import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SampleBufferStateEntity } from '../../../src/entities/index.js';
import { SampleBufferError } from '../../../src/errors/SampleBufferError.js';
import { SampleBufferStateScenarioCaseEntity } from '../entities/SampleBufferStateScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { type: 'json' };

type ScenarioShape = SampleBufferStateScenarioCaseEntity.Type['shape'];
type RunnerMap = { [K in ScenarioShape]: (scenarioCase: SampleBufferStateScenarioCaseEntity.Type & { shape: K }) => void };

const runnerMap: RunnerMap = {
  'error-args': (scenarioCase) => {
    const err = new SampleBufferError(scenarioCase.input.message, {
      'cause': RuntimeError.create(scenarioCase.input.causeMessage),
      'correlationId': scenarioCase.input.correlationId,
      ...(scenarioCase.input.retryable === undefined ? {} : { 'retryable': scenarioCase.input.retryable })
    });
    assert.equal(err.message, scenarioCase.expected.message);
    assert.equal(err.correlationId, scenarioCase.expected.correlationId);
    assert.equal(err.retryable, scenarioCase.expected.retryable);
    assert.ok(err.cause instanceof Error);
    assert.equal(err.cause.message, scenarioCase.expected.causeMessage);
  },
  'invalid-length': runValidationCase,
  'valid-state': runValidationCase
};

function dispatchCase<K extends ScenarioShape>(shape: K, scenarioCase: SampleBufferStateScenarioCaseEntity.Type & { shape: K }): void {
  runnerMap[shape](scenarioCase);
}

function runCase(scenarioCase: SampleBufferStateScenarioCaseEntity.Type): void {
  dispatchCase(scenarioCase.shape, scenarioCase);
}

function runValidationCase(scenarioCase: SampleBufferStateScenarioCaseEntity.Type & { shape: 'invalid-length' | 'valid-state' }): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = SampleBufferStateEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

const fileIntake = ScenarioFileCompiler.compileIntake(SampleBufferStateScenarioCaseEntity.Schema, SampleBufferStateScenarioCaseEntity.Node);

void describe('SampleBufferStateEntity', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
