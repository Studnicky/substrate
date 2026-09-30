import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';
import type { RetryConfigInterface } from '../../../src/interfaces/index.js';

import { Retry } from '../../../src/retry/index.js';
import { HookTimeoutScenarioCaseEntity } from '../entities/HookTimeoutScenarioCaseEntity.js';
import { AsyncHook } from './fixtures/AsyncHook.js';
import { DelayedOperation } from './fixtures/DelayedOperation.js';
import { FailingOperation } from './fixtures/FailingOperation.js';
import { FlakyOperation } from './fixtures/FlakyOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import scenarioGroups from './hook-timeout.scenarios.json' with { 'type': 'json' };

class HookTimeoutRunners {
  static async 'enter-call-unset'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'enter-call-unset'>): Promise<void> {
    const { expected, input } = scenario;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config?: RetryConfigInterface) {
        super(config ?? {});
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw RuntimeError.create(String(input.message));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry ?? {});
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static async 'fast-hook'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'fast-hook'>): Promise<void> {
    const { expected, input } = scenario;

    const retry = Retry.create(input.retry ?? {});
    assert.strictEqual(Reflect.set(retry, 'onAttempt', AsyncHook.delayed(1)), true);
    const result = await retry.execute(DelayedOperation.of(Number(input.delayMs), String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static async 'hung-attempt-with-timeout'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'hung-attempt-with-timeout'>): Promise<void> {
    const { expected, input } = scenario;

    const retry = Retry.create(input.retry ?? {});
    assert.strictEqual(Reflect.set(retry, 'onAttempt', AsyncHook.hanging), true);
    const startedAt = Date.now();
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    const elapsedMs = Date.now() - startedAt;

    assert.strictEqual(result, String(expected.result));
    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  }

  static async 'hung-attempt-without-timeout'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'hung-attempt-without-timeout'>): Promise<void> {
    const { expected, input } = scenario;

    const retry = Retry.create(input.retry ?? {});
    assert.strictEqual(Reflect.set(retry, 'onAttempt', AsyncHook.hanging), true);
    const timedOutMarker = 'timed-out';
    const raceResult = await Promise.race([
      retry.execute(ResolvingOperation.of(String(input.result ?? 'ok'))),
      setTimeout(100, timedOutMarker)
    ]);

    assert.strictEqual(raceResult, String(expected.raceResult));
  }

  static async 'hung-give-up-with-timeout'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'hung-give-up-with-timeout'>): Promise<void> {
    const { expected, input } = scenario;

    const retry = Retry.create({
      'errorClassifier': RetryClassifier.nonRetryable,
      ...input.retry
    });
    assert.strictEqual(Reflect.set(retry, 'onGiveUp', AsyncHook.hanging), true);

    const startedAt = Date.now();
    await assert.rejects(
      retry.execute(new FailingOperation(String(input.errorMessage)).run),
      { 'name': String(expected.errorShape) }
    );
    const elapsedMs = Date.now() - startedAt;

    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  }

  static async 'hung-retry-scheduled'(scenario: ScenarioCaseOfType<HookTimeoutScenarioCaseEntity.Type, 'hung-retry-scheduled'>): Promise<void> {
    const { expected, input } = scenario;

    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });
    assert.strictEqual(Reflect.set(retry, 'onRetryScheduled', AsyncHook.hanging), true);
    const startedAt = Date.now();
    const { attempts, result } = await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.errorMessage), String(input.result));
    const elapsedMs = Date.now() - startedAt;

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
    assert.ok(elapsedMs < Number(expected.elapsedLessThanMs));
  }
}

ScenarioSuite.register({
  'entity': HookTimeoutScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Retry hook timeouts',
  'runners': HookTimeoutRunners
});
