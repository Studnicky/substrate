import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SampleBufferStateEntity } from '../../../src/index.js';
import { SampleBufferError } from '../../../src/errors/SampleBufferError.js';
import scenarioGroups from './entity-contracts.scenarios.json';

type ScenarioDescriptor<K extends string, Input, Expected> = {
  description: string;
  expected: Expected;
  input: Input;
  kind: K;
  name: string;
};

type ValidationScenario = ScenarioDescriptor<
  'invalid-length' | 'valid-state',
  { validations: { expected: boolean; value: Record<string, unknown> }[] },
  { validationResults: boolean[] }
>;

type ErrorArgsScenario = ScenarioDescriptor<
  'error-args',
  { causeMessage: string; correlationId: string; message: string; retryable: boolean },
  { causeMessage: string; correlationId: string; message: string; retryable: boolean }
>;

type ScenarioCaseMap = {
  'error-args': ErrorArgsScenario;
  'invalid-length': ValidationScenario;
  'valid-state': ValidationScenario;
};

type ScenarioKind = keyof ScenarioCaseMap;
type ScenarioCase = ScenarioCaseMap[ScenarioKind];
type RunnerMap = { [K in ScenarioKind]: (scenarioCase: ScenarioCaseMap[K]) => void };

const runnerMap: RunnerMap = {
  'error-args': (scenarioCase) => {
    const err = new SampleBufferError(scenarioCase.input.message, {
      'cause': new Error(scenarioCase.input.causeMessage),
      'correlationId': scenarioCase.input.correlationId,
      'retryable': scenarioCase.input.retryable
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

function dispatchCase<K extends ScenarioKind>(kind: K, scenarioCase: ScenarioCaseMap[K]): void {
  runnerMap[kind](scenarioCase);
}

function runCase<K extends ScenarioKind>(scenarioCase: ScenarioCaseMap[K]): void {
  dispatchCase(scenarioCase.kind, scenarioCase);
}

function runValidationCase(scenarioCase: ValidationScenario): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = SampleBufferStateEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('SampleBufferStateEntity', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
