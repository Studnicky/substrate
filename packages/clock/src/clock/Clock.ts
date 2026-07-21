/**
 * Wall-clock and monotonic time, sourced from a `ClockProvider`.
 * Construct one per scope and inject into consumers that need time.
 * Monotonicity is enforced per instance — `now()` and `hrtime()` never
 * return a value smaller than the previous call on the same instance.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';

import type { ClockProviderInterface } from '../interfaces/ClockProviderInterface.js';

import { ClockError } from '../errors/ClockError.js';

const HRTIME_ZERO = 0n;

/**
 * Time source instance. Delegates to a `ClockProvider` (real or virtual)
 * while enforcing per-instance monotonicity for `now()` and `hrtime()`.
 */
export class Clock {
  static create(provider: ClockProviderInterface): Clock {
    return new this(provider);
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

  private static isValidProvider(provider: unknown): provider is ClockProviderInterface {
    return (
      typeof provider === 'object' &&
      provider !== null &&
      'now' in provider &&
      typeof provider.now === 'function' &&
      'hrtime' in provider &&
      typeof provider.hrtime === 'function'
    );
  }

  /**
   * Extension seam: subclasses may override to intercept or replace the raw
   * hrtime value before monotonicity clamping is applied.
   */
  protected readHrtime(): bigint {
    const result = this.#provider.hrtime();
    return result;
  }

  /**
   * Extension seam: subclasses may override to intercept or replace the raw
   * now value before monotonicity clamping is applied.
   */
  protected readNow(): number {
    const result = this.#provider.now();
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
    const candidate = this.readHrtime();

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
    const candidate = this.readNow();

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
