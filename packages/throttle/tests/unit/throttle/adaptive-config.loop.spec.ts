import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Batch } from '@studnicky/batch';
import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';
import { ConfigurationError } from '@studnicky/config';
import { HookInvocationError } from '@studnicky/errors';

import { ThrottleConfigEntity, Throttle } from '../../../src/index.js';
import { AdaptiveConfigEntity } from '../../../src/entities/AdaptiveConfigEntity.js';
import { ValidatedAdaptiveConfigEntity } from '../../../src/entities/ValidatedAdaptiveConfigEntity.js';
import { ValidatedThrottleConfigEntity } from '../../../src/entities/ValidatedThrottleConfigEntity.js';
import scenarioGroups from './adaptive-config.scenarios.json';

type AdjustmentDirection = 'down' | 'none' | 'up';

type ScenarioShape =
  | 'adaptive-adjust-hook-throws'
  | 'adaptive-no-change'
  | 'adaptive-scales-down'
  | 'adaptive-scales-up'
  | 'default-max-concurrency'
  | 'default-min-concurrency'
  | 'reject-adaptive-empty'
  | 'reject-adaptive-step-size-string'
  | 'reject-adjustment-interval-less-than-100'
  | 'reject-concurrency-above-max'
  | 'reject-concurrency-below-min'
  | 'reject-min-concurrency-less-than-one'
  | 'reject-min-greater-than-max'
  | 'reject-missing-enabled'
  | 'reject-missing-target-latency'
  | 'reject-non-boolean-enabled'
  | 'reject-non-integer-adjustment-interval'
  | 'reject-non-integer-min-concurrency'
  | 'reject-non-integer-sample-window'
  | 'reject-non-integer-step-size'
  | 'reject-non-object-adaptive'
  | 'reject-non-positive-scale-up'
  | 'reject-non-positive-target-latency'
  | 'reject-sample-window-less-than-10'
  | 'reject-scale-up-not-less-than-scale-down'
  | 'reject-step-size-less-than-one'
  | 'reject-unknown-key'
  | 'valid-all-fields'
  | 'valid-disabled-defaulted-config'
  | 'valid-disabled-no-extra-fields'
  | 'valid-required-fields';

interface AdaptiveClockInputInterface {
  operationDurationMs: number;
  operationSpacingMs: number;
  startMs: number;
}

interface AdaptiveBatchInputInterface {
  itemCount: number;
  maxConcurrent: number;
}

interface ScenarioExpectedInterface {
  adaptive?: {
    enabled?: boolean;
    maxConcurrency?: number;
    minConcurrency?: number;
    targetLatencyMs?: number;
  };
  adjustmentDirection?: AdjustmentDirection;
  concurrencyLimit?: number;
  enabled?: boolean;
  error?: string;
  hookErrorMessage?: string;
  maxConcurrency?: number;
  minConcurrency?: number;
  rejectEnabledTrue?: boolean;
  throttleValidated?: boolean;
  validated?: boolean;
}

interface ScenarioInputInterface {
  batch?: AdaptiveBatchInputInterface;
  clock?: AdaptiveClockInputInterface;
  disabledConfig?: Record<string, unknown>;
  hookErrorMessage?: string;
  throttle?: Record<string, unknown>;
}

interface ScenarioCase {
  description: string;
  expected: ScenarioExpectedInterface;
  input: ScenarioInputInterface;
  shape: ScenarioShape;
  name: string;
}

interface VirtualDateNowInterface {
  advanceOperationDuration: () => void;
  advanceOperationStart: () => void;
  restore: () => void;
}

function decodeThrottleConfig(config: ScenarioInputInterface['throttle']): Parameters<typeof Throttle.create>[0] {
  if (config === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(config));
}

function getThrottleConfigRecord(scenarioCase: ScenarioCase): Record<string, unknown> {
  return scenarioCase.input.throttle ?? {};
}

function createScenarioThrottle(scenarioCase: ScenarioCase): Throttle {
  return Throttle.create(decodeThrottleConfig(scenarioCase.input.throttle));
}

function installVirtualDateNow(input: AdaptiveClockInputInterface): VirtualDateNowInterface {
  const originalNow = Date.now;
  const counter = VirtualTimeCounter.create({ startMs: input.startMs });
  const clock = Clock.create(VirtualClockProvider.create(counter));

  Date.now = () => clock.now();

  return {
    advanceOperationDuration: () => { counter.advance(input.operationDurationMs); },
    advanceOperationStart: () => { counter.advance(input.operationSpacingMs); },
    restore: () => { Date.now = originalNow; }
  };
}

function createScenarioBatch<TResult>(input: AdaptiveBatchInputInterface): Batch<TResult> {
  return Batch.create<TResult>(input.maxConcurrent);
}

async function executeAdaptiveSamples(
  throttle: Throttle,
  input: ScenarioInputInterface
): Promise<void> {
  const { batch, clock } = input;
  assert.ok(batch !== undefined);
  assert.ok(clock !== undefined);

  const items = Array.from({ length: batch.itemCount }, (_unused, index) => index);
  const workload = createScenarioBatch<string | undefined>(batch);
  const virtualDateNow = installVirtualDateNow(clock);
  try {
    let executed = 0;
    for await (const results of workload.process(items, async (index) => {
      virtualDateNow.advanceOperationStart();
      return await throttle.execute(async () => {
        virtualDateNow.advanceOperationDuration();
        return `result-${String(index)}`;
      });
    })) {
      executed += results.length;
    }
    assert.strictEqual(executed, batch.itemCount);
  } finally {
    virtualDateNow.restore();
  }
}

function assertAdaptiveObservation(
  scenarioCase: ScenarioCase,
  observed: Array<{ previousLimit: number; newLimit: number }>,
  throttle: Throttle
): void {
  if (scenarioCase.expected.adjustmentDirection === 'up') {
    assert.ok(observed.length >= 1);
    assert.ok(observed[0] !== undefined);
    assert.ok(observed[0].newLimit > observed[0].previousLimit);
  } else if (scenarioCase.expected.adjustmentDirection === 'down') {
    assert.ok(observed.length >= 1);
    assert.ok(observed[0] !== undefined);
    assert.ok(observed[0].newLimit < observed[0].previousLimit);
  } else if (scenarioCase.expected.adjustmentDirection === 'none') {
    assert.strictEqual(observed.length, 0);
  }

  if (scenarioCase.expected.concurrencyLimit !== undefined) {
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }
}

function assertValidAllFields(scenarioCase: ScenarioCase): void {
  const throttle = createScenarioThrottle(scenarioCase);
  const stats = throttle.getStats();
  const expectedAdaptive = scenarioCase.expected.adaptive;
  assert.ok(expectedAdaptive !== undefined);
  assert.ok(stats.adaptive !== undefined);
  assert.strictEqual(stats.concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  assert.strictEqual(stats.adaptive.enabled, expectedAdaptive.enabled);
  assert.strictEqual(stats.adaptive.minConcurrency, expectedAdaptive.minConcurrency);
  assert.strictEqual(stats.adaptive.maxConcurrency, expectedAdaptive.maxConcurrency);
  assert.strictEqual(stats.adaptive.targetLatencyMs, expectedAdaptive.targetLatencyMs);
}

function assertValidRequiredFields(scenarioCase: ScenarioCase): void {
  const throttle = createScenarioThrottle(scenarioCase);
  const stats = throttle.getStats();
  assert.ok(stats.adaptive !== undefined);
  assert.strictEqual(stats.adaptive.minConcurrency, scenarioCase.expected.minConcurrency);
  assert.strictEqual(stats.adaptive.maxConcurrency, scenarioCase.expected.maxConcurrency);
}

function assertValidDisabledNoExtraFields(scenarioCase: ScenarioCase): void {
  const throttle = createScenarioThrottle(scenarioCase);
  const stats = throttle.getStats();
  if (stats.adaptive !== undefined) {
    assert.strictEqual(stats.adaptive.enabled, scenarioCase.expected.enabled);
  }
}

function assertValidDisabledDefaultedConfig(scenarioCase: ScenarioCase): void {
  const disabledConfig = scenarioCase.input.disabledConfig ?? {};
  assert.strictEqual(ValidatedAdaptiveConfigEntity.validate(disabledConfig), scenarioCase.expected.validated);
  assert.strictEqual(
    ValidatedThrottleConfigEntity.validate({ ...scenarioCase.input.throttle, adaptive: disabledConfig }),
    scenarioCase.expected.throttleValidated
  );
  assert.throws(() => {
    return ValidatedAdaptiveConfigEntity.validate({ ...disabledConfig, enabled: true });
  }, ConfigurationError);
  assert.strictEqual(scenarioCase.expected.rejectEnabledTrue, true);
}

function assertThrottleConfigEntityRejects(scenarioCase: ScenarioCase): void {
  assert.throws(() => {
    return ThrottleConfigEntity.validate(getThrottleConfigRecord(scenarioCase));
  }, ConfigurationError);
}

function assertThrottleCreateRejects(scenarioCase: ScenarioCase): void {
  assert.throws(() => {
    return Throttle.create(decodeThrottleConfig(scenarioCase.input.throttle));
  }, ConfigurationError);
}

function assertAdaptiveEmptyRejects(scenarioCase: ScenarioCase): void {
  const throttleConfig = getThrottleConfigRecord(scenarioCase);
  assert.throws(() => { return AdaptiveConfigEntity.validate(throttleConfig.adaptive); }, ConfigurationError);
  assert.throws(() => { return ValidatedThrottleConfigEntity.validate(throttleConfig); }, ConfigurationError);
}

function assertAdaptiveStepSizeRejects(scenarioCase: ScenarioCase): void {
  const throttleConfig = getThrottleConfigRecord(scenarioCase);
  assert.throws(() => { return AdaptiveConfigEntity.validate(throttleConfig.adaptive); }, ConfigurationError);
  assertThrottleCreateRejects(scenarioCase);
}

async function assertAdaptiveRuntimeObserved(scenarioCase: ScenarioCase): Promise<void> {
  const observed: Array<{ previousLimit: number; newLimit: number }> = [];

  class ObservedAdaptiveThrottle extends Throttle {
    static override create(config: Parameters<typeof Throttle.create>[0] = {}): ObservedAdaptiveThrottle {
      return new this(config);
    }

    protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
      observed.push({ previousLimit, newLimit });
    }
  }

  const throttle = ObservedAdaptiveThrottle.create(decodeThrottleConfig(scenarioCase.input.throttle));
  await executeAdaptiveSamples(throttle, scenarioCase.input);
  assertAdaptiveObservation(scenarioCase, observed, throttle);
}

async function assertAdaptiveRuntimeHookThrows(scenarioCase: ScenarioCase): Promise<void> {
  const observed: Array<{ previousLimit: number; newLimit: number }> = [];
  const hookError = new Error(scenarioCase.input.hookErrorMessage ?? 'adaptive adjust failed');

  class ObservedAdaptiveThrottle extends Throttle {
    static override create(config: Parameters<typeof Throttle.create>[0] = {}): ObservedAdaptiveThrottle {
      return new this(config);
    }

    protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
      observed.push({ previousLimit, newLimit });
    }
  }

  class ThrowingAdaptiveThrottle extends ObservedAdaptiveThrottle {
    protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
      super.onAdaptiveAdjust(previousLimit, newLimit);
      throw hookError;
    }
  }

  const throttle = ThrowingAdaptiveThrottle.create(decodeThrottleConfig(scenarioCase.input.throttle));
  await assert.rejects(async () => {
    await executeAdaptiveSamples(throttle, scenarioCase.input);
  }, (error: unknown) => {
    assert.ok(error instanceof HookInvocationError);
    assert.strictEqual(error.cause, hookError);
    assert.strictEqual(error.name, scenarioCase.expected.error);
    assert.strictEqual(hookError.message, scenarioCase.expected.hookErrorMessage);
    return true;
  });
  assert.strictEqual(throttle.isComplete(), true);
}

function assertDefaultMinConcurrency(scenarioCase: ScenarioCase): void {
  const throttle = createScenarioThrottle(scenarioCase);
  const stats = throttle.getStats();
  assert.ok(stats.adaptive !== undefined);
  assert.strictEqual(stats.adaptive.minConcurrency, scenarioCase.expected.minConcurrency);
}

function assertDefaultMaxConcurrency(scenarioCase: ScenarioCase): void {
  const throttle = createScenarioThrottle(scenarioCase);
  const stats = throttle.getStats();
  assert.ok(stats.adaptive !== undefined);
  assert.strictEqual(stats.adaptive.maxConcurrency, scenarioCase.expected.maxConcurrency);
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'adaptive-adjust-hook-throws': assertAdaptiveRuntimeHookThrows,
  'adaptive-no-change': assertAdaptiveRuntimeObserved,
  'adaptive-scales-down': assertAdaptiveRuntimeObserved,
  'adaptive-scales-up': assertAdaptiveRuntimeObserved,
  'default-max-concurrency': assertDefaultMaxConcurrency,
  'default-min-concurrency': assertDefaultMinConcurrency,
  'reject-adaptive-empty': assertAdaptiveEmptyRejects,
  'reject-adaptive-step-size-string': assertAdaptiveStepSizeRejects,
  'reject-adjustment-interval-less-than-100': assertThrottleCreateRejects,
  'reject-concurrency-above-max': assertThrottleCreateRejects,
  'reject-concurrency-below-min': assertThrottleCreateRejects,
  'reject-min-concurrency-less-than-one': assertThrottleCreateRejects,
  'reject-min-greater-than-max': assertThrottleCreateRejects,
  'reject-missing-enabled': assertThrottleConfigEntityRejects,
  'reject-missing-target-latency': assertThrottleCreateRejects,
  'reject-non-boolean-enabled': assertThrottleConfigEntityRejects,
  'reject-non-integer-adjustment-interval': assertThrottleCreateRejects,
  'reject-non-integer-min-concurrency': assertThrottleCreateRejects,
  'reject-non-integer-sample-window': assertThrottleCreateRejects,
  'reject-non-integer-step-size': assertThrottleCreateRejects,
  'reject-non-object-adaptive': assertThrottleConfigEntityRejects,
  'reject-non-positive-scale-up': assertThrottleCreateRejects,
  'reject-non-positive-target-latency': assertThrottleCreateRejects,
  'reject-sample-window-less-than-10': assertThrottleCreateRejects,
  'reject-scale-up-not-less-than-scale-down': assertThrottleCreateRejects,
  'reject-step-size-less-than-one': assertThrottleCreateRejects,
  'reject-unknown-key': assertThrottleCreateRejects,
  'valid-all-fields': assertValidAllFields,
  'valid-disabled-defaulted-config': assertValidDisabledDefaultedConfig,
  'valid-disabled-no-extra-fields': assertValidDisabledNoExtraFields,
  'valid-required-fields': assertValidRequiredFields
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle adaptive config', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
