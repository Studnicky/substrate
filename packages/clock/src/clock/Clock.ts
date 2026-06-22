/**
 * Wall-clock and monotonic time, sourced from a `ClockProvider`.
 * Construct one per scope and inject into consumers that need time.
 * Monotonicity is enforced per instance — `now()` and `hrtime()` never
 * return a value smaller than the previous call on the same instance.
 *
 * @module
 */
import type { ClockProviderType } from '../interfaces/ClockProviderType.js';

const HRTIME_ZERO = 0n;

/**
 * Time source instance. Delegates to a `ClockProvider` (real or virtual)
 * while enforcing per-instance monotonicity for `now()` and `hrtime()`.
 */
export class Clock {
  readonly #provider: ClockProviderType;
  #lastHrtime: bigint;
  #lastNow: number;

  /**
   * Property write order: #provider, #lastHrtime, #lastNow.
   */
  public constructor(provider: ClockProviderType) {
    this.#provider = provider;
    this.#lastHrtime = HRTIME_ZERO;
    this.#lastNow = 0;
  }

  /**
   * Extension seam: subclasses may override to intercept or replace the raw
   * hrtime value before monotonicity clamping is applied.
   */
  protected readHrtime(): bigint {
    return this.#provider.hrtime();
  }

  /**
   * Extension seam: subclasses may override to intercept or replace the raw
   * now value before monotonicity clamping is applied.
   */
  protected readNow(): number {
    return this.#provider.now();
  }

  /**
   * Returns a monotonic nanosecond timestamp from the underlying provider.
   * Never returns a value smaller than the previous call on this instance.
   */
  public hrtime(): bigint {
    const candidate = this.readHrtime();

    if (candidate > this.#lastHrtime) {
      this.#lastHrtime = candidate;
    }

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

    return this.#lastNow;
  }
}
