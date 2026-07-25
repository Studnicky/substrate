import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import type { VisibleRangeConfigInterface } from '../../../src/index.js';

import { VisibleRange, VisibleRangeError } from '../../../src/index.js';
import scenarioGroups from './config-validation.scenarios.json';

type ScenarioKind = 'ambiguous-size' | 'error-args' | 'missing-size' | 'negative-size' | 'zero-size';

type SerializableVisibleRangeConfig = {
  readonly count: number;
  readonly estimateSizeValue?: number;
  readonly itemSize?: number;
};

type ScenarioCase = {
  readonly description: string;
  readonly expected: { readonly errorName: 'VisibleRangeError' };
  readonly input: { readonly visibleRange: SerializableVisibleRangeConfig };
  readonly kind: ScenarioKind;
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
  const error = new VisibleRangeError('manual visible-range error', {
    'cause': new Error('cause'),
    'correlationId': 'corr-123',
    'metadata': { 'source': 'unit-test' },
    'retryable': false
  });

  assert.ok(error instanceof VisibleRangeError);
  assert.equal(error.message, 'manual visible-range error');
  assert.equal(error.code, 'visibleRange.invalidConfig');
}

function runInvalidConfigCase(scenarioCase: ScenarioCase): void {
  assert.throws(() => {
    VisibleRange.create(buildConfig(scenarioCase.input.visibleRange));
  }, (error: unknown) => {
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
} satisfies Record<ScenarioKind, (scenarioCase: ScenarioCase) => void>;

function runCase(scenarioCase: ScenarioCase): void {
  scenarioRunners[scenarioCase.kind](scenarioCase);
}

void describe('VisibleRange config validation', () => {
  for (const scenario of scenarioCases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
