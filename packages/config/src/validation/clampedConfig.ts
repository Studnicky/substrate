/**
 * Configuration clamping utility.
 *
 * Soft-correction utility for configuration fields: given a
 * flat config object and a declarative table of `{min, max, reason}` per
 * numeric field, returns a NEW object with out-of-range numeric fields clamped
 * into range instead of throwing.
 *
 * Subclass and `static override onClamp` to observe or log clamp events; the
 * default hook is a no-op.
 */

import { HookInvoker } from '@studnicky/errors';

import type { ClampEventEntity } from '../entities/ClampEventEntity.js';
import type { ClampRuleEntity } from '../entities/ClampRuleEntity.js';

class ClampedConfigHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}

export class ClampedConfig {
  protected static readonly hooks: HookInvoker = new ClampedConfigHookInvoker();

  /**
   * Extension seam — called by `apply` for every field that gets clamped.
   * Subclasses may `static override` to observe or log clamp events instead.
   *
   * Fire-point: called once per clamped field, after the value has been
   * computed but before it is written into the returned object. Default is a
   * no-op; no dependency on any logging package.
   */
  protected static onClamp(_event: ClampEventEntity.Type): void {
    // no-op default — subclasses override to observe clamp events
  }

  /**
   * Return a new object with out-of-range numeric fields clamped into range.
   *
   * For each key present in both `rules` and `config`: if the value is a
   * number and falls outside `[min, max]`, the returned object carries the
   * clamped value and `onClamp` fires. Fields that are not numeric, not
   * present in `config`, or already in-range are copied through unchanged.
   * The input object is never mutated.
   */
  public static apply<T extends Record<string, unknown>>(
    config: T,
    rules: Readonly<Record<string, ClampRuleEntity.Type>>
  ): T {
    const result: T = { ...config };

    const entries = Object.entries(rules);
    const configValues = new Map(Object.entries(config));
    const length = entries.length;

    for (let index = 0; index < length; index += 1) {
      const entry = entries[index];

      if (entry === undefined) {
        continue;
      }
      const [
        field,
        rule
      ] = entry;

      if (!configValues.has(field)) {
        continue;
      }
      const raw = configValues.get(field);

      if (typeof raw !== 'number') {
        continue;
      }
      if (raw >= rule.minimum && raw <= rule.maximum) {
        continue;
      }
      const clamped = Math.min(Math.max(raw, rule.minimum), rule.maximum);

      Reflect.set(result, field, clamped);
      const event: ClampEventEntity.Type = {
        'clamped': clamped,
        'field': field,
        'raw': raw,
        'reason': rule.reason
      };

      this.hooks.invoke('onClamp', () => {
        const hookResult = this.onClamp(event);

        return hookResult;
      });
    }

    return result;
  }
}
