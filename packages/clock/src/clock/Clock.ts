/**
 * Wall-clock and monotonic time, sourced from a `ClockProvider`.
 * Construct one per scope and inject into consumers that need time.
 * Monotonicity is enforced per instance — `now()` and `hrtime()` never
 * return a value smaller than the previous call on the same instance.
 *
 * @module
 */

import type { ClockProviderType } from '../types/ClockProviderType.js';

import { ClockError } from '../errors/ClockError.js';
import { ClockBuilder } from './ClockBuilder.js';

const HRTIME_ZERO = 0n;

/**
 * Time source instance. Delegates to a `ClockProvider` (real or virtual)
 * while enforcing per-instance monotonicity for `now()` and `hrtime()`.
 */
export class Clock {
  static builder(): ClockBuilder {
    const result = ClockBuilder.create((provider) => {
      const clock = Clock.create(provider);
      return clock;
    });
    return result;
  }

  static create(provider: ClockProviderType): Clock {
    return new this(provider);
  }

  readonly #provider: ClockProviderType;
  #lastHrtime: bigint;
  #lastNow: number;

  /**
   * Property write order: #provider, #lastHrtime, #lastNow.
   */
  protected constructor(provider: ClockProviderType) {
    if (!Clock.isValidProvider(provider)) {
      throw new ClockError('provider must implement ClockProviderType');
    }
    this.#provider = provider;
    this.#lastHrtime = HRTIME_ZERO;
    this.#lastNow = 0;
  }

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  private static isValidProvider(provider: unknown): provider is ClockProviderType {
    return (
      typeof provider === 'object' &&
      provider !== null &&
      typeof (provider as ClockProviderType).now === 'function' &&
      typeof (provider as ClockProviderType).hrtime === 'function'
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
   * value that was returned to the caller.
   */
  protected onNow(_timestamp: number): void {}

  /**
   * Fires after each `hrtime()` call, with the monotonically-clamped
   * nanosecond bigint value that was returned to the caller.
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

    this.#invokeHook(() => {
      this.onHrtime(this.#lastHrtime);
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

    this.#invokeHook(() => {
      this.onNow(this.#lastNow);
    });
    return this.#lastNow;
  }
}
