import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { ClampedConfig } from '../../../src/validation/clampedConfig.js';
import type { ClampEventEntity } from '../../../src/entities/ClampEventEntity.js';
import type { ClampRuleEntity } from '../../../src/entities/ClampRuleEntity.js';

void describe('ClampedConfig', () => {
  void describe('apply', () => {
    void it('clamps a field below min up to min', () => {
      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 100);
    });

    void it('clamps a field above max down to max', () => {
      const config = { timeoutMs: 999999 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too high' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 5000);
    });

    void it('leaves an in-range field untouched', () => {
      const config = { timeoutMs: 2000 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout out of range' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 2000);
    });

    void it('leaves a field not present in rules untouched', () => {
      const config = { timeoutMs: 2000, unruled: -99999 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout out of range' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.strictEqual(result.unruled, -99999);
    });

    void it('leaves a non-numeric field untouched even if the key is ruled', () => {
      const config = { timeoutMs: 'not-a-number' as unknown as number };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout out of range' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 'not-a-number');
    });

    void it('leaves a field absent from config untouched (rule with no matching key)', () => {
      const config = { other: 1 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout out of range' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.deepStrictEqual(result, { other: 1 });
    });

    void it('returns a new object, not the same reference as the input', () => {
      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      const result = ClampedConfig.apply(config, rules);

      assert.notStrictEqual(result, config);
      assert.strictEqual(config.timeoutMs, 10, 'input must not be mutated');
    });
  });

  void describe('onClamp hook', () => {
    void it('fires with raw/clamped/reason when a field is clamped', () => {
      const events: ClampEventEntity.Type[] = [];
      class ObservingClampedConfig extends ClampedConfig {
        protected static override onClamp(event: ClampEventEntity.Type): void {
          events.push(event);
        }
      }

      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      ObservingClampedConfig.apply(config, rules);

      assert.strictEqual(events.length, 1);
      assert.deepStrictEqual(events[0], {
        field: 'timeoutMs',
        raw: 10,
        clamped: 100,
        reason: 'timeout too low',
      });
    });

    void it('does not fire for a field left in range', () => {
      const events: ClampEventEntity.Type[] = [];
      class ObservingClampedConfig extends ClampedConfig {
        protected static override onClamp(event: ClampEventEntity.Type): void {
          events.push(event);
        }
      }

      const config = { timeoutMs: 2000 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout out of range' },
      };

      ObservingClampedConfig.apply(config, rules);

      assert.strictEqual(events.length, 0);
    });

    void it('observes every clamp event across multiple fields', () => {
      const events: ClampEventEntity.Type[] = [];
      class ObservingClampedConfig extends ClampedConfig {
        protected static override onClamp(event: ClampEventEntity.Type): void {
          events.push(event);
        }
      }

      const config = { timeoutMs: 10, retries: 999, concurrency: 4 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
        retries: { min: 0, max: 10, reason: 'retries too high' },
        concurrency: { min: 1, max: 8, reason: 'concurrency out of range' },
      };

      const result = ObservingClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 100);
      assert.strictEqual(result.retries, 10);
      assert.strictEqual(result.concurrency, 4);
      assert.strictEqual(events.length, 2);
      assert.ok(events.some((e) => e.field === 'timeoutMs' && e.raw === 10 && e.clamped === 100));
      assert.ok(events.some((e) => e.field === 'retries' && e.raw === 999 && e.clamped === 10));
    });

    void it('default ClampedConfig has a no-op onClamp (does not throw)', () => {
      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      assert.doesNotThrow(() => ClampedConfig.apply(config, rules));
    });

    void it('a throwing onClamp hook surfaces as a HookInvocationError', () => {
      const cause = new Error('onClamp boom');
      class ThrowingClampedConfig extends ClampedConfig {
        protected static override onClamp(): void {
          throw cause;
        }
      }

      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      assert.throws(
        () => ThrowingClampedConfig.apply(config, rules),
        (error: unknown) => {
          assert.ok(error instanceof HookInvocationError);
          assert.strictEqual(error.hookName, 'onClamp');
          assert.strictEqual(error.cause, cause);
          return true;
        }
      );
    });

    void it('a throwing onClamp hook does not corrupt the input config', () => {
      class ThrowingClampedConfig extends ClampedConfig {
        protected static override onClamp(): void {
          throw new Error('onClamp boom');
        }
      }

      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      assert.throws(() => ThrowingClampedConfig.apply(config, rules));
      assert.strictEqual(config.timeoutMs, 10, 'input must not be mutated even when the hook throws');
    });

    void it('routes a rejection from an unexpectedly-async onClamp override to onHookError without ever producing an unhandled rejection', async () => {
      const erroredCauses: unknown[] = [];
      class AsyncOverrideClampedConfig extends ClampedConfig {
        // Declared signature is `void`; TypeScript's void-return leniency
        // structurally permits this `async` override even though `apply` is
        // a synchronous, non-awaiting call site.
        protected static override async onClamp(_event: ClampEventEntity.Type): Promise<void> {
          throw new Error('async onClamp boom');
        }

        protected static override onHookError(cause: unknown): void {
          erroredCauses.push(cause);
        }
      }

      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const config = { timeoutMs: 10 };
        const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
          timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
        };

        // Synchronous call site — `apply` is not async and never awaits
        // `onClamp`'s result, exactly as a real hot-path caller would use it.
        const result = AsyncOverrideClampedConfig.apply(config, rules);
        assert.strictEqual(result.timeoutMs, 100, 'sync clamping still applies even though onClamp is async');

        // Give the microtask/macrotask queues a couple of turns so the
        // rejection settles and any (incorrect) unhandledRejection event
        // would have already fired.
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        assert.strictEqual(rejectionEvents.length, 0);
        assert.strictEqual(erroredCauses.length, 1);
        assert.ok(erroredCauses[0] instanceof Error);
        assert.strictEqual((erroredCauses[0] as Error).message, 'async onClamp boom');
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });
});
