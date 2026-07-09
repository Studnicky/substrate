/** Local deterministic feature-flag evaluation with percentage rollout and observability hooks */

import { Hash } from '@studnicky/json';

import type { FlagContextType } from './types/FlagContextType.js';
import type { FlagDefinitionType } from './types/FlagDefinitionType.js';

const BUCKET_SPACE = 100;

/**
 * Registers named boolean flag definitions and resolves each evaluation deterministically —
 * no remote fetch, no polling, no SDK/vendor coupling. This is the pure local-evaluation core
 * OpenFeature's spec separates from its remote `Provider`; a consuming application wires its
 * own remote-fetch/polling layer on top if it needs one.
 *
 * Percentage rollout is bucketed via `@studnicky/json`'s `Hash.value()`, hashing
 * `flag + ':' + targetingKey` into a deterministic `[0, 100)` integer bucket — the same flag
 * and targeting key always land in the same bucket, so the same caller always gets the same
 * answer for a given flag, and different flags bucket independently for the same targeting key.
 *
 * `evaluate()` for a flag that was never registered returns `false` and fires `onDefault` —
 * it does not consult `defaultValue`, since there is no definition to read one from. Registered
 * `defaultValue` is only consulted when the flag is registered but `enabled: false`.
 *
 * @example
 * ```typescript
 * const evaluator = FlagEvaluator.create();
 *
 * evaluator.register('new-checkout', { enabled: true, rolloutPercent: 25, defaultValue: false });
 *
 * const on = evaluator.evaluate('new-checkout', { targetingKey: 'user-42' });
 * ```
 */
export class FlagEvaluator {
  static create(): FlagEvaluator {
    return new FlagEvaluator();
  }

  readonly #registry = new Map<string, FlagDefinitionType>();

  protected constructor() {}

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  /** Registers (or replaces) a named flag definition. */
  register(name: string, definition: FlagDefinitionType): void {
    this.#registry.set(name, definition);
  }

  /** Removes a named flag definition. No-op if the name was never registered. */
  unregister(name: string): void {
    this.#registry.delete(name);
  }

  has(name: string): boolean {
    const result = this.#registry.has(name);
    return result;
  }

  list(): readonly string[] {
    const keys = this.#registry.keys();
    return [...keys];
  }

  /**
   * Resolves a boolean decision for `name` given `context`.
   *
   * - Unregistered `name`: fires `onDefault(name)`, returns `false`.
   * - Registered, `enabled: false`: returns `definition.defaultValue`.
   * - Registered, `enabled: true`: buckets `context.targetingKey` deterministically into
   *   `[0, 100)` and returns `bucket < (definition.rolloutPercent ?? 100)`. Fires
   *   `onRuleMismatch(name, context)` when the bucket falls outside the rollout range.
   *
   * `onEvaluate(name, context, result)` always fires last, on every path, before returning.
   */
  evaluate(name: string, context: FlagContextType): boolean {
    const definition = this.#registry.get(name);

    if (definition === undefined) {
      this.#invokeHook(() => {
        this.onDefault(name);
      });
      const result = false;
      this.#invokeHook(() => {
        this.onEvaluate(name, context, result);
      });
      return result;
    }

    if (!definition.enabled) {
      const result = definition.defaultValue;
      this.#invokeHook(() => {
        this.onEvaluate(name, context, result);
      });
      return result;
    }

    const rolloutPercent = definition.rolloutPercent ?? BUCKET_SPACE;
    const bucket = FlagEvaluator.#bucket(name, context.targetingKey ?? '');
    const result = bucket < rolloutPercent;

    if (!result) {
      this.#invokeHook(() => {
        this.onRuleMismatch(name, context);
      });
    }

    this.#invokeHook(() => {
      this.onEvaluate(name, context, result);
    });
    return result;
  }

  /**
   * Deterministically maps `name + ':' + targetingKey` into a `[0, 100)` integer bucket.
   *
   * `Hash.value()` returns an 8-character lowercase hex string (a 32-bit FNV-1a digest).
   * Parsed as a base-16 integer and reduced `% 100`, it yields a stable, uniformly-distributed
   * bucket for any input string — the same `name`/`targetingKey` pair always produces the same
   * bucket, and changing either input changes the hashed string and therefore the bucket.
   */
  static #bucket(name: string, targetingKey: string): number {
    const hex = Hash.value(`${name}:${targetingKey}`);
    const bucket = Number.parseInt(hex, 16) % BUCKET_SPACE;
    return bucket;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires after every resolution, on every path, with the final boolean result. */
  protected onEvaluate(_flag: string, _context: Record<string, unknown>, _result: boolean): void {}

  /** Fires when `evaluate()` is called for a flag name that was never registered. */
  protected onDefault(_flag: string): void {}

  /** Fires when an enabled flag's rollout bucket falls outside the enabled range. */
  protected onRuleMismatch(_flag: string, _context: Record<string, unknown>): void {}
}
