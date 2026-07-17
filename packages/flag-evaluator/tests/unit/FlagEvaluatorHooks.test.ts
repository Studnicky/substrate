import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { FlagEvaluator } from '../../src/FlagEvaluator.js';
import type { FlagContextType } from '../../src/types/FlagContextType.js';

class ObservedEvaluator extends FlagEvaluator {
  static override create(): ObservedEvaluator {
    return new ObservedEvaluator();
  }

  readonly evaluateCalls: { 'flag': string; 'context': Record<string, unknown>; 'result': boolean }[] = [];
  readonly defaultCalls: string[] = [];
  readonly ruleMismatchCalls: { 'flag': string; 'context': Record<string, unknown> }[] = [];

  protected override onEvaluate(flag: string, context: Record<string, unknown>, result: boolean): void {
    this.evaluateCalls.push({ 'context': context, 'flag': flag, 'result': result });
  }

  protected override onDefault(flag: string): void {
    this.defaultCalls.push(flag);
  }

  protected override onRuleMismatch(flag: string, context: Record<string, unknown>): void {
    this.ruleMismatchCalls.push({ 'context': context, 'flag': flag });
  }
}

describe('FlagEvaluator lifecycle hooks', () => {
  let evaluator: ObservedEvaluator;

  beforeEach(() => {
    evaluator = ObservedEvaluator.create();
  });

  it('onDefault fires only for an unregistered flag', () => {
    evaluator.evaluate('missing', { 'targetingKey': 'user-1' });

    assert.deepEqual(evaluator.defaultCalls, ['missing']);
  });

  it('onDefault does not fire for a registered flag, enabled or disabled', () => {
    evaluator.register('disabled-flag', { 'defaultValue': true, 'enabled': false });
    evaluator.register('enabled-flag', { 'defaultValue': false, 'enabled': true });

    evaluator.evaluate('disabled-flag', {});
    evaluator.evaluate('enabled-flag', { 'targetingKey': 'user-1' });

    assert.deepEqual(evaluator.defaultCalls, []);
  });

  it('onRuleMismatch fires only for the rollout-percentage-exclusion case, not the disabled-flag case', () => {
    evaluator.register('disabled-flag', { 'defaultValue': false, 'enabled': false });
    evaluator.register('zero-rollout', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 0 });

    evaluator.evaluate('disabled-flag', { 'targetingKey': 'user-1' });
    // rolloutPercent: 0 means bucket < 0 is never true, so every targetingKey mismatches
    evaluator.evaluate('zero-rollout', { 'targetingKey': 'user-1' });
    evaluator.evaluate('zero-rollout', { 'targetingKey': 'user-2' });

    assert.deepEqual(evaluator.ruleMismatchCalls.map((c) => c.flag), ['zero-rollout', 'zero-rollout']);
  });

  it('onRuleMismatch does not fire for an unregistered flag', () => {
    evaluator.evaluate('missing', { 'targetingKey': 'user-1' });

    assert.deepEqual(evaluator.ruleMismatchCalls, []);
  });

  it('onEvaluate fires last on every path, exactly once per evaluate() call, with the final result', () => {
    evaluator.register('disabled-flag', { 'defaultValue': true, 'enabled': false });
    evaluator.register('full-rollout', { 'defaultValue': false, 'enabled': true });
    evaluator.register('zero-rollout', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 0 });

    evaluator.evaluate('missing', { 'targetingKey': 'a' });
    evaluator.evaluate('disabled-flag', { 'targetingKey': 'a' });
    evaluator.evaluate('full-rollout', { 'targetingKey': 'a' });
    evaluator.evaluate('zero-rollout', { 'targetingKey': 'a' });

    assert.equal(evaluator.evaluateCalls.length, 4);
    assert.deepEqual(evaluator.evaluateCalls.map((c) => ({ 'flag': c.flag, 'result': c.result })), [
      { 'flag': 'missing', 'result': false },
      { 'flag': 'disabled-flag', 'result': true },
      { 'flag': 'full-rollout', 'result': true },
      { 'flag': 'zero-rollout', 'result': false }
    ]);
  });

  it('onEvaluate context matches the exact context object passed to evaluate()', () => {
    evaluator.register('flag', { 'defaultValue': false, 'enabled': true });
    const context: FlagContextType = { 'plan': 'pro', 'targetingKey': randomUUID() };

    evaluator.evaluate('flag', context);

    assert.deepEqual(evaluator.evaluateCalls[0]!.context, context);
  });

  it('a throwing onDefault hook does not replace the fallback false result', () => {
    class ThrowingDefaultEvaluator extends FlagEvaluator {
      static override create(): ThrowingDefaultEvaluator {
        return new ThrowingDefaultEvaluator();
      }

      protected override onDefault(): void {
        throw new Error('onDefault boom');
      }
    }

    const throwingEvaluator = ThrowingDefaultEvaluator.create();

    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate('missing', { 'targetingKey': 'user-1' }), false);
    });
  });

  it('a throwing onRuleMismatch hook does not replace the computed false rollout decision', () => {
    class ThrowingMismatchEvaluator extends FlagEvaluator {
      static override create(): ThrowingMismatchEvaluator {
        return new ThrowingMismatchEvaluator();
      }

      protected override onRuleMismatch(): void {
        throw new Error('onRuleMismatch boom');
      }
    }

    const throwingEvaluator = ThrowingMismatchEvaluator.create();
    throwingEvaluator.register('zero-rollout', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 0 });

    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate('zero-rollout', { 'targetingKey': 'user-1' }), false);
    });
  });

  it('a throwing onEvaluate hook does not replace a completed evaluation result', () => {
    class ThrowingEvaluateEvaluator extends FlagEvaluator {
      static override create(): ThrowingEvaluateEvaluator {
        return new ThrowingEvaluateEvaluator();
      }

      protected override onEvaluate(): void {
        throw new Error('onEvaluate boom');
      }
    }

    const throwingEvaluator = ThrowingEvaluateEvaluator.create();
    throwingEvaluator.register('enabled-flag', { 'defaultValue': false, 'enabled': true });

    assert.doesNotThrow(() => {
      assert.equal(throwingEvaluator.evaluate('enabled-flag', { 'targetingKey': 'user-1' }), true);
    });
  });

  it('an async-rejecting onEvaluate override is routed safely, producing no unhandled rejection', async () => {
    class AsyncRejectingEvaluateEvaluator extends FlagEvaluator {
      static override create(): AsyncRejectingEvaluateEvaluator {
        return new AsyncRejectingEvaluateEvaluator();
      }

      protected override onEvaluate(): Promise<void> {
        return Promise.reject(new Error('onEvaluate async boom'));
      }
    }

    const asyncEvaluator = AsyncRejectingEvaluateEvaluator.create();
    asyncEvaluator.register('enabled-flag', { 'defaultValue': false, 'enabled': true });

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const result = asyncEvaluator.evaluate('enabled-flag', { 'targetingKey': 'user-1' });
      assert.equal(result, true);

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.deepEqual(rejectionEvents, []);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
