import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONSchema7Type } from 'json-schema';

import { CircularBufferError } from '../../../src/errors/CircularBufferError.js';

import scenarioGroups from './CircularBufferError.scenarios.json' with { type: 'json' };

type ScenarioShape = 'default-construction' | 'with-args' | 'with-cause';

type ScenarioCase = {
  description: string;
  expected: {
    code: string;
    correlationId?: string;
    message: string;
    metadata?: Record<string, JSONSchema7Type>;
    retryable: boolean;
  };
  input: {
    args?: {
      cause?: unknown;
      correlationId?: string;
      metadata?: Record<string, JSONSchema7Type>;
      retryable?: boolean;
    };
    message: string;
  };
  shape: ScenarioShape;
  name: string;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function assertBaseError(error: CircularBufferError, scenarioCase: ScenarioCase): void {
  assert.equal(error.name, 'CircularBufferError');
  assert.equal(error.code, scenarioCase.expected.code);
  assert.equal(error.message, scenarioCase.expected.message);
  assert.equal(error.retryable, scenarioCase.expected.retryable);
}

function assertDefaultConstruction(scenarioCase: ScenarioCase): void {
  const error = new CircularBufferError(scenarioCase.input.message);
  assertBaseError(error, scenarioCase);
  assert.equal(error.cause, undefined);
}

function assertWithArgs(scenarioCase: ScenarioCase): void {
  const error = new CircularBufferError(scenarioCase.input.message, scenarioCase.input.args);
  assertBaseError(error, scenarioCase);
  assert.equal(error.correlationId, scenarioCase.expected.correlationId);
  assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
}

function assertWithCause(scenarioCase: ScenarioCase): void {
  const error = new CircularBufferError(scenarioCase.input.message, scenarioCase.input.args);
  assertBaseError(error, scenarioCase);
  assert.equal(error.correlationId, scenarioCase.expected.correlationId);
  assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
  assert.equal(error.cause, scenarioCase.input.args?.cause);
}

const runnerMap = {
  'default-construction': assertDefaultConstruction,
  'with-args': assertWithArgs,
  'with-cause': assertWithCause
} satisfies Record<ScenarioShape, ScenarioRunner>;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('CircularBufferError', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
