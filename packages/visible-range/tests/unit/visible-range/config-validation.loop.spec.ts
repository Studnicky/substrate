import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import type { VisibleRangeConfigInterface } from '../../../src/interfaces/index.js';

import { VisibleRange, VisibleRangeError } from '../../../src/index.js';
import scenarioGroups from './config-validation.scenarios.json' with { type: 'json' };

type ScenarioShape = 'ambiguous-size' | 'error-args' | 'missing-size' | 'negative-size' | 'zero-size';

type SerializableVisibleRangeConfig = {
  readonly count: number;
  readonly estimateSizeValue?: number;
  readonly itemSize?: number;
};

type ScenarioCase = {
  readonly description: string;
  readonly expected: { readonly errorName: 'VisibleRangeError' };
  readonly input: { readonly visibleRange: SerializableVisibleRangeConfig };
  readonly shape: ScenarioShape;
  readonly name: string;
};

const scenarioCases = scenarioGroups.cases as readonly ScenarioCase[];

function buildConfig(config: SerializableVisibleRangeConfig): VisibleRangeConfigInterface {
  const estimateSizeValue = config.estimateSizeValue;
  if (estimateSizeValue !== undefined) {
    return {
      'count': config.count,
      'estimateSize': () => estimateSizeValue,
      ...(config.itemSize === undefined ? {} : { 'itemSize': config.itemSize })
    };
  }

  return {
    'count': config.count,
    ...(config.itemSize === undefined ? {} : { 'itemSize': config.itemSize })
  };
}

function runErrorArgsCase(): void {
  const cause = RuntimeError.create('cause');
  const error = new VisibleRangeError('manual visible-range error', {
    'cause': cause,
    'correlationId': 'corr-123',
    'metadata': { 'source': 'unit-test' },
    'retryable': true
  });

  assert.ok(error instanceof VisibleRangeError);
  assert.equal(error.message, 'manual visible-range error');
  assert.equal(error.code, 'visibleRange.invalidConfig');
  assert.equal(error.cause, cause);
  assert.equal(error.correlationId, 'corr-123');
  assert.deepStrictEqual(error.metadata, { 'source': 'unit-test' });
  assert.equal(error.retryable, true);

  const defaulted = new VisibleRangeError('defaulted visible-range error');
  assert.equal(defaulted.retryable, false);
}

function runInvalidConfigCase(scenarioCase: ScenarioCase): void {
  assert.throws(() => {
    VisibleRange.create(buildConfig(scenarioCase.input.visibleRange));
  }, (error: Error) => {
    assert.ok(error instanceof VisibleRangeError);
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    return true;
  });
}

const scenarioRunners = {
  'ambiguous-size': runInvalidConfigCase,
  'error-args': runErrorArgsCase,
  'missing-size': runInvalidConfigCase,
  'negative-size': runInvalidConfigCase,
  'zero-size': runInvalidConfigCase
} satisfies Record<ScenarioShape, (scenarioCase: ScenarioCase) => void>;

function runCase(scenarioCase: ScenarioCase): void {
  scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('VisibleRange config validation', () => {
  for (const scenario of scenarioCases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
