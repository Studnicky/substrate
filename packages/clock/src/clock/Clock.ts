/**
 * Wall-clock and monotonic time, sourced from a `ClockProvider`.
 * Construct one per scope and inject into consumers that need time.
 * Monotonicity is enforced per instance — `now()` and `hrtime()` never
 * return a value smaller than the previous call on the same instance.
 *
 * @module
 */

import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { ClockProviderInterface } from '../interfaces/ClockProviderInterface.js';

import { ClockError } from '../errors/ClockError.js';

const HRTIME_ZERO = 0n;

interface ClockSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class ClockInstance {
  static belongsTo<TInstance extends object>(constructor: ClockSubclassInterface<TInstance>, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * Time source instance. Delegates to a `ClockProvider` (real or virtual)
 * while enforcing per-instance monotonicity for `now()` and `hrtime()`.
 */
export class Clock {
  static create<TInstance extends Clock = Clock>(
    this: ClockSubclassInterface<TInstance>,
    provider: ClockProviderInterface
  ): TInstance {
    const result: unknown = Reflect.construct(this, [provider]);
    if (!Predicates.isObjectLike(result) || !ClockInstance.belongsTo(this, result)) {
      throw RuntimeError.create('Clock.create() did not construct the requested subclass.');
    }
    return result;
  }

  readonly #provider: ClockProviderInterface;
  #lastHrtime: bigint;
  #lastNow: number;

  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Property write order: #provider, #lastHrtime, #lastNow.
   */
  protected constructor(provider: ClockProviderInterface) {
    if (!Clock.isValidProvider(provider)) {
      throw new ClockError('provider must implement ClockProviderInterface');
    }
    this.#provider = provider;
    this.#lastHrtime = HRTIME_ZERO;
    this.#lastNow = 0;
  }

  private static isValidProvider(provider: ClockProviderInterface): boolean {
    const result = Predicates.isFunction(provider.now) && Predicates.isFunction(provider.hrtime);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /**
   * Fires after each `now()` call, with the monotonically-clamped epoch-ms
   * value that was returned to the caller. A throwing override surfaces as a
   * `HookInvocationError` from `now()`.
   */
  protected onNow(_timestamp: number): void {}

  /**
   * Fires after each `hrtime()` call, with the monotonically-clamped
   * nanosecond bigint value that was returned to the caller. A throwing
   * override surfaces as a `HookInvocationError` from `hrtime()`.
   */
  protected onHrtime(_value: bigint): void {}

  /**
   * Returns a monotonic nanosecond timestamp from the underlying provider.
   * Never returns a value smaller than the previous call on this instance.
   */
  public hrtime(): bigint {
    const candidate = this.#provider.hrtime();

    if (candidate > this.#lastHrtime) {
      this.#lastHrtime = candidate;
    }

    this.hooks.invoke('onHrtime', () => {
      const result = this.onHrtime(this.#lastHrtime);
      return result;
    });
    return this.#lastHrtime;
  }

  /**
   * Returns the current epoch-ms from the underlying provider.
   * Never returns a value smaller than the previous call on this instance.
   */
  public now(): number {
    const candidate = this.#provider.now();

    if (candidate > this.#lastNow) {
      this.#lastNow = candidate;
    }

    this.hooks.invoke('onNow', () => {
      const result = this.onNow(this.#lastNow);
      return result;
    });
    return this.#lastNow;
  }
}
