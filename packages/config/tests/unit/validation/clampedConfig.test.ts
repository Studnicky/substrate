import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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

    void it('a throwing onClamp hook does not replace the clamped result', () => {
      class ThrowingClampedConfig extends ClampedConfig {
        protected static override onClamp(): void {
          throw new Error('onClamp boom');
        }
      }

      const config = { timeoutMs: 10 };
      const rules: Readonly<Record<string, ClampRuleEntity.Type>> = {
        timeoutMs: { min: 100, max: 5000, reason: 'timeout too low' },
      };

      const result = ThrowingClampedConfig.apply(config, rules);

      assert.strictEqual(result.timeoutMs, 100);
    });
  });
});
