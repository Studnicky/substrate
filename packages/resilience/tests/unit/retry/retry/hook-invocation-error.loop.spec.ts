import { HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { RetryCallStateEntity } from '../../../../src/retry/entities/RetryCallStateEntity.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Retry } from '../../../../src/retry/retry/index.js';
import { HookInvocationErrorScenarioCaseEntity } from '../entities/HookInvocationErrorScenarioCaseEntity.js';
import { AsyncHook } from './fixtures/AsyncHook.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import { RetryFixture } from './fixtures/RetryFixture.js';
import scenarioGroups from './hook-invocation-error.scenarios.json' with { 'type': 'json' };

class HookInvocationErrorRunners {
  static async 'async-rejects-are-guarded'(scenario: ScenarioCaseOfType<HookInvocationErrorScenarioCaseEntity.Type, 'async-rejects-are-guarded'>): Promise<void> {
    const { expected, input } = scenario;
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => { unhandledRejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const retry = RetryFixture.create(input.retry);
      assert.strictEqual(Reflect.set(retry, 'enterCall', AsyncHook.rejecting(String(input.message))), true);
      const result = await retry.execute(ResolvingOperation.of(String(input.result)));

      await setImmediate();
      await setImmediate();

      assert.strictEqual(result, String(expected.result));
      assert.strictEqual(unhandledRejectionCount, Number(expected.unhandledRejections));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'enter-call-swallows'(scenario: ScenarioCaseOfType<HookInvocationErrorScenarioCaseEntity.Type, 'enter-call-swallows'>): Promise<void> {
    const { expected, input } = scenario;

    class ThrowingEnterCallRetry extends Retry {
      constructor(config = {}) {
        super(RetryFixture.options(config));
      }

      protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
        throw RuntimeError.create(String(input.message));
      }
    }

    const retry = new ThrowingEnterCallRetry(input.retry ?? {});
    const result = await retry.execute(ResolvingOperation.of(String(input.result)));
    assert.strictEqual(result, String(expected.result));
  }

  static 'hookinvoker-default-throws'(scenario: ScenarioCaseOfType<HookInvocationErrorScenarioCaseEntity.Type, 'hookinvoker-default-throws'>): void {
    const { expected, input } = scenario;
    const invoker = new HookInvoker();
    try {
      invoker.invoke(String(input.hookName), () => { throw RuntimeError.create(String(input.message)); });
      assert.fail('HookInvoker.invoke must reject when its hook throws.');
    } catch (error) {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.name, String(expected.errorShape));
      assert.strictEqual(error.hookName, String(expected.hookName));
      assert.ok(error.cause instanceof Error);
      assert.strictEqual(error.cause.message, String(expected.causeMessage));
    }
  }
}

ScenarioSuite.register({
  'entity': HookInvocationErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Retry hook invocation errors',
  'runners': HookInvocationErrorRunners
});
