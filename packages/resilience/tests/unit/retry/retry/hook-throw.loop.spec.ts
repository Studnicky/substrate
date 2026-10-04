import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { RetryCallStateEntity } from '../../../../src/retry/entities/RetryCallStateEntity.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Retry } from '../../../../src/retry/retry/index.js';
import { HookThrowScenarioCaseEntity } from '../entities/HookThrowScenarioCaseEntity.js';
import { AsyncHook } from './fixtures/AsyncHook.js';
import { FailingOperation } from './fixtures/FailingOperation.js';
import { FlakyOperation } from './fixtures/FlakyOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryClassifier } from './fixtures/RetryClassifier.js';
import { RetryFixture } from './fixtures/RetryFixture.js';
import scenarioGroups from './hook-throw.scenarios.json' with { 'type': 'json' };

class HookThrowRunners {
  static async 'enter-call'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'enter-call'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry);
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static async 'on-attempt'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-attempt'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingAttemptRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onAttempt(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingAttemptRetry(input.retry);
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static async 'on-give-up-exhausted'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-give-up-exhausted'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingExhaustedGiveUpRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onGiveUp(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingExhaustedGiveUpRetry({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });

    await assert.rejects(
      retry.execute(new FailingOperation(String(input.errorMessage)).run),
      { 'name': String(expected.errorShape) }
    );
  }

  static async 'on-give-up-non-retryable'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-give-up-non-retryable'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingGiveUpRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onGiveUp(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingGiveUpRetry({
      'errorClassifier': RetryClassifier.nonRetryable,
      ...input.retry
    });

    await assert.rejects(
      retry.execute(new FailingOperation(String(input.errorMessage)).run),
      { 'name': String(expected.errorShape) }
    );
  }

  static async 'on-retry-scheduled'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-retry-scheduled'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingRetryScheduledRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onRetryScheduled(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingRetryScheduledRetry({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });
    const { attempts, result } = await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.firstErrorMessage), String(input.result));

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  }

  static async 'on-retry-scheduled-async'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-retry-scheduled-async'>): Promise<void> {
    const { expected, input } = scenarioCase;

    const retry = Retry.create({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });
    assert.strictEqual(Reflect.set(retry, 'onRetryScheduled', AsyncHook.rejecting(String(input.hookErrorMessage))), true);
    const { attempts, result } = await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.firstErrorMessage), String(input.result));

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  }

  static async 'on-retryable-error'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-retryable-error'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingRetryableErrorRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onRetryableError(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingRetryableErrorRetry({
      'errorClassifier': RetryClassifier.retryable,
      ...input.retry
    });
    const { attempts, result } = await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.firstErrorMessage), String(input.result));

    assert.strictEqual(result, String(expected.result));
    assert.strictEqual(attempts, Number(expected.attempts));
  }

  static async 'on-success'(scenarioCase: ScenarioCaseOfType<HookThrowScenarioCaseEntity.Type, 'on-success'>): Promise<void> {
    const { expected, input } = scenarioCase;

    class ThrowingSuccessRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override onSuccess(): void {
        throw RuntimeError.create(String(input.hookErrorMessage));
      }
    }

    const retry = new ThrowingSuccessRetry(input.retry);
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }
}

ScenarioSuite.register({
  'entity': HookThrowScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Retry hook throws',
  'runners': HookThrowRunners
});
