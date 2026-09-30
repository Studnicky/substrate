import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { Batch } from '@studnicky/batch/node';
import { ConfigurationError } from '@studnicky/config/node';
import { SchemaIntakeError } from '@studnicky/entity/node';
import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AdaptiveConfigEntity,
  ThrottleConfigEntity,
  ValidatedAdaptiveConfigEntity,
  ValidatedThrottleConfigEntity
} from '../../../src/entities/index.js';
import { Throttle } from '../../../src/index.js';
import { VirtualClockThrottle } from '../../helpers/VirtualClockThrottle.js';
import scenarioGroups from './adaptive-config.scenarios.json' with { 'type': 'json' };
import { AdaptiveConfigScenarioCaseEntity } from './entities/AdaptiveConfigScenarioCaseEntity.js';

class AdaptiveConfigRunners {
  static async 'adaptive-adjust-hook-throws'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'adaptive-adjust-hook-throws'>): Promise<void> {
    const observed: { 'newLimit': number; 'previousLimit': number; }[] = [];
    const hookError = RuntimeError.create(scenarioCase.input.hookErrorMessage ?? 'adaptive adjust failed');

    class ObservedAdaptiveThrottle extends VirtualClockThrottle {
      protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
        observed.push({ 'newLimit': newLimit, 'previousLimit': previousLimit });
      }
    }

    class ThrowingAdaptiveThrottle extends ObservedAdaptiveThrottle {
      protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
        super.onAdaptiveAdjust(previousLimit, newLimit);
        throw hookError;
      }
    }

    const clock = ScenarioValues.requireDefined(scenarioCase.input.clock, 'input.clock');
    const throttle = ThrowingAdaptiveThrottle.createWithClock(clock, AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    await assert.rejects(AdaptiveConfigRunners.executeAdaptiveSamples(throttle, scenarioCase.input.batch), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, hookError);
      assert.strictEqual(error.name, scenarioCase.expected.error);
      assert.strictEqual(hookError.message, scenarioCase.expected.hookErrorMessage);
      return true;
    });
    assert.strictEqual(throttle.isComplete(), true);
  }

  static async 'adaptive-no-change'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'adaptive-no-change'>): Promise<void> {
    const observed: { 'newLimit': number; 'previousLimit': number; }[] = [];

    class ObservedAdaptiveThrottle extends VirtualClockThrottle {
      protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
        observed.push({ 'newLimit': newLimit, 'previousLimit': previousLimit });
      }
    }

    const clock = ScenarioValues.requireDefined(scenarioCase.input.clock, 'input.clock');
    const throttle = ObservedAdaptiveThrottle.createWithClock(clock, AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    await AdaptiveConfigRunners.executeAdaptiveSamples(throttle, scenarioCase.input.batch);
    AdaptiveConfigRunners.assertAdaptiveObservation(scenarioCase.expected, observed, throttle);
  }

  static async 'adaptive-scales-down'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'adaptive-scales-down'>): Promise<void> {
    const observed: { 'newLimit': number; 'previousLimit': number; }[] = [];

    class ObservedAdaptiveThrottle extends VirtualClockThrottle {
      protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
        observed.push({ 'newLimit': newLimit, 'previousLimit': previousLimit });
      }
    }

    const clock = ScenarioValues.requireDefined(scenarioCase.input.clock, 'input.clock');
    const throttle = ObservedAdaptiveThrottle.createWithClock(clock, AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    await AdaptiveConfigRunners.executeAdaptiveSamples(throttle, scenarioCase.input.batch);
    AdaptiveConfigRunners.assertAdaptiveObservation(scenarioCase.expected, observed, throttle);
  }

  static async 'adaptive-scales-up'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'adaptive-scales-up'>): Promise<void> {
    const observed: { 'newLimit': number; 'previousLimit': number; }[] = [];

    class ObservedAdaptiveThrottle extends VirtualClockThrottle {
      protected override onAdaptiveAdjust(previousLimit: number, newLimit: number): void {
        observed.push({ 'newLimit': newLimit, 'previousLimit': previousLimit });
      }
    }

    const clock = ScenarioValues.requireDefined(scenarioCase.input.clock, 'input.clock');
    const throttle = ObservedAdaptiveThrottle.createWithClock(clock, AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    await AdaptiveConfigRunners.executeAdaptiveSamples(throttle, scenarioCase.input.batch);
    AdaptiveConfigRunners.assertAdaptiveObservation(scenarioCase.expected, observed, throttle);
  }

  static 'default-max-concurrency'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'default-max-concurrency'>): void {
    const throttle = Throttle.create(AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    const stats = throttle.getStats();
    assert.ok(stats.adaptive !== undefined);
    assert.strictEqual(stats.adaptive.maximumConcurrency, scenarioCase.expected.maximumConcurrency);
  }

  static 'default-min-concurrency'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'default-min-concurrency'>): void {
    const throttle = Throttle.create(AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    const stats = throttle.getStats();
    assert.ok(stats.adaptive !== undefined);
    assert.strictEqual(stats.adaptive.minimumConcurrency, scenarioCase.expected.minimumConcurrency);
  }

  static 'reject-adaptive-empty'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-adaptive-empty'>): void {
    const throttleConfig = scenarioCase.input.throttle ?? {};
    assert.throws(() => { AdaptiveConfigEntity.intake(throttleConfig.adaptive); }, SchemaIntakeError);
    assert.throws(() => { ValidatedThrottleConfigEntity.intake(throttleConfig); }, SchemaIntakeError);
  }

  static 'reject-adaptive-step-size-string'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-adaptive-step-size-string'>): void {
    const throttleConfig = scenarioCase.input.throttle ?? {};
    assert.throws(() => { AdaptiveConfigEntity.intake(throttleConfig.adaptive); }, SchemaIntakeError);
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-adjustment-interval-less-than-100'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-adjustment-interval-less-than-100'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-concurrency-above-max'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-concurrency-above-max'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-concurrency-below-min'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-concurrency-below-min'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-min-concurrency-less-than-one'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-min-concurrency-less-than-one'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-min-greater-than-max'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-min-greater-than-max'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-missing-target-latency'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-missing-target-latency'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-integer-adjustment-interval'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-integer-adjustment-interval'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-integer-min-concurrency'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-integer-min-concurrency'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-integer-sample-window'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-integer-sample-window'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-integer-step-size'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-integer-step-size'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-positive-scale-up'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-positive-scale-up'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-positive-target-latency'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-positive-target-latency'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-sample-window-less-than-10'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-sample-window-less-than-10'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-scale-up-not-less-than-scale-down'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-scale-up-not-less-than-scale-down'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-step-size-less-than-one'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-step-size-less-than-one'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-unknown-key'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-unknown-key'>): void {
    AdaptiveConfigRunners.assertThrottleCreateRejects(scenarioCase.input.throttle);
  }

  static 'reject-missing-enabled'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-missing-enabled'>): void {
    AdaptiveConfigRunners.assertThrottleConfigEntityRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-boolean-enabled'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-boolean-enabled'>): void {
    AdaptiveConfigRunners.assertThrottleConfigEntityRejects(scenarioCase.input.throttle);
  }

  static 'reject-non-object-adaptive'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'reject-non-object-adaptive'>): void {
    AdaptiveConfigRunners.assertThrottleConfigEntityRejects(scenarioCase.input.throttle);
  }

  static 'valid-all-fields'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'valid-all-fields'>): void {
    const throttle = Throttle.create(AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    const stats = throttle.getStats();
    const expectedAdaptive = ScenarioValues.requireDefined(scenarioCase.expected.adaptive, 'expected.adaptive');
    assert.ok(stats.adaptive !== undefined);
    assert.strictEqual(stats.concurrencyLimit, scenarioCase.expected.concurrencyLimit);
    assert.strictEqual(stats.adaptive.enabled, expectedAdaptive.enabled);
    assert.strictEqual(stats.adaptive.minimumConcurrency, expectedAdaptive.minimumConcurrency);
    assert.strictEqual(stats.adaptive.maximumConcurrency, expectedAdaptive.maximumConcurrency);
    assert.strictEqual(stats.adaptive.targetLatencyMs, expectedAdaptive.targetLatencyMs);
  }

  static 'valid-disabled-defaulted-config'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'valid-disabled-defaulted-config'>): void {
    const disabledConfig = scenarioCase.input.disabledConfig ?? {};
    assert.strictEqual(ValidatedAdaptiveConfigEntity.validate(disabledConfig), scenarioCase.expected.validated);
    assert.strictEqual(
      ValidatedThrottleConfigEntity.validate({ ...scenarioCase.input.throttle, 'adaptive': disabledConfig }),
      scenarioCase.expected.throttleValidated
    );
    assert.throws(() => {
      ValidatedAdaptiveConfigEntity.intake({ ...disabledConfig, 'enabled': true });
    }, SchemaIntakeError);
    assert.strictEqual(scenarioCase.expected.rejectEnabledTrue, true);
  }

  static 'valid-disabled-no-extra-fields'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'valid-disabled-no-extra-fields'>): void {
    const throttle = Throttle.create(AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    const stats = throttle.getStats();
    if (stats.adaptive !== undefined) {
      assert.strictEqual(stats.adaptive.enabled, scenarioCase.expected.enabled);
    }
  }

  static 'valid-required-fields'(scenarioCase: ScenarioCaseOfType<AdaptiveConfigScenarioCaseEntity.Type, 'valid-required-fields'>): void {
    const throttle = Throttle.create(AdaptiveConfigRunners.cloneConfig(scenarioCase.input.throttle));
    const stats = throttle.getStats();
    assert.ok(stats.adaptive !== undefined);
    assert.strictEqual(stats.adaptive.minimumConcurrency, scenarioCase.expected.minimumConcurrency);
    assert.strictEqual(stats.adaptive.maximumConcurrency, scenarioCase.expected.maximumConcurrency);
  }

  private static assertAdaptiveObservation(
    expected: AdaptiveConfigScenarioCaseEntity.Type['expected'],
    observed: readonly { 'newLimit': number; 'previousLimit': number; }[],
    throttle: Throttle
  ): void {
    const first = observed[0];
    if (expected.adjustmentDirection === 'up') {
      assert.ok(observed.length >= 1);
      assert.ok(first !== undefined);
      assert.ok(first.newLimit > first.previousLimit);
    } else if (expected.adjustmentDirection === 'down') {
      assert.ok(observed.length >= 1);
      assert.ok(first !== undefined);
      assert.ok(first.newLimit < first.previousLimit);
    } else if (expected.adjustmentDirection === 'none') {
      assert.strictEqual(observed.length, 0);
    }

    if (expected.concurrencyLimit !== undefined) {
      assert.strictEqual(throttle.getStats().concurrencyLimit, expected.concurrencyLimit);
    }
  }

  private static assertThrottleConfigEntityRejects(config: AdaptiveConfigScenarioCaseEntity.Type['input']['throttle']): void {
    assert.throws(() => { ThrottleConfigEntity.intake(config ?? {}); }, SchemaIntakeError);
  }

  private static assertThrottleCreateRejects(config: AdaptiveConfigScenarioCaseEntity.Type['input']['throttle']): void {
    assert.throws(() => { Throttle.create(AdaptiveConfigRunners.cloneConfig(config)); }, ConfigurationError);
  }

  private static cloneConfig(config: AdaptiveConfigScenarioCaseEntity.Type['input']['throttle']): Parameters<typeof Throttle.create>[0] {
    try {
      const cloned = structuredClone(config);
      return cloned;
    } catch (cause) {
      throw RuntimeError.create('Scenario throttle configuration is not structured-cloneable', { 'cause': cause });
    }
  }

  private static async executeAdaptiveSamples(
    throttle: VirtualClockThrottle,
    batch: AdaptiveConfigScenarioCaseEntity.Type['input']['batch']
  ): Promise<void> {
    const definedBatch = ScenarioValues.requireDefined(batch, 'input.batch');
    const items: number[] = [];
    for (let index = 0; index < definedBatch.itemCount; index += 1) {
      items.push(index);
    }
    const workload = Batch.create<string | undefined>(definedBatch.maximumConcurrent);
    const worker = AdaptiveConfigRunners.createSampleWorker(throttle);

    let executed = 0;
    for await (const results of workload.process(items, worker)) {
      executed += results.length;
    }
    assert.strictEqual(executed, definedBatch.itemCount);
  }

  private static createSampleWorker(throttle: VirtualClockThrottle): (index: number) => Promise<string | undefined> {
    const worker = async (index: number): Promise<string | undefined> => {
      throttle.advanceOperationStart();
      const executed = await throttle.execute(() => {
        throttle.advanceOperationDuration();
        const settled = Promise.resolve(`result-${String(index)}`);
        return settled;
      });
      return executed;
    };
    return worker;
  }
}

ScenarioSuite.register({
  'entity': AdaptiveConfigScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle adaptive config',
  'runners': AdaptiveConfigRunners
});

const VALID_ENABLED_ADAPTIVE_CONFIG = {
  'adjustmentInterval': 1000,
  'enabled': true,
  'maximumConcurrency': 100,
  'minimumConcurrency': 1,
  'sampleWindow': 100,
  'scaleDownThreshold': 1.5,
  'scaleUpThreshold': 0.5,
  'stepSize': 1,
  'targetLatencyMs': 500
} as const;

void describe('ValidatedAdaptiveConfigEntity anyOf of closed branches', () => {
  void it('rejects a payload no single branch fully accepts: enabled true with a disabled-only targetLatencyMs', () => {
    const payload = { ...VALID_ENABLED_ADAPTIVE_CONFIG, 'targetLatencyMs': 0 };
    assert.strictEqual(ValidatedAdaptiveConfigEntity.validate(payload), false);
    assert.throws(() => { ValidatedAdaptiveConfigEntity.intake(payload); }, SchemaIntakeError);
  });

  void it('rejects a payload no single branch fully accepts: an additional property neither closed branch admits', () => {
    const payload = { ...VALID_ENABLED_ADAPTIVE_CONFIG, 'unknownField': 'unexpected' };
    assert.strictEqual(ValidatedAdaptiveConfigEntity.validate(payload), false);
    assert.throws(() => { ValidatedAdaptiveConfigEntity.intake(payload); }, SchemaIntakeError);
  });

  void it('accepts a payload the enabled branch fully accepts', () => {
    assert.strictEqual(ValidatedAdaptiveConfigEntity.validate(VALID_ENABLED_ADAPTIVE_CONFIG), true);
  });
});
