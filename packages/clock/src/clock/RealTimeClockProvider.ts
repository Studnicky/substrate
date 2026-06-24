/**
 * Default `ClockProvider` implementation using `Date.now()` and `performance.now()`.
 * Browser-safe and Node-safe — both APIs are available in ES2023+ environments.
 *
 * @module
 */
import type { ClockProviderType } from '../interfaces/ClockProviderType.js';

import { ClockError } from '../errors/ClockError.js';

/** Named constant: nanoseconds per millisecond (as BigInt). */
const NS_PER_MS = 1_000_000n;

/**
 * Concrete `ClockProvider` backed by `Date.now()` and `performance.now()`.
 * Supports an optional epoch offset for clock-skew correction.
 */
export class RealTimeClockProvider implements ClockProviderType {
  /**
   * Optional epoch offset applied to `now()` and `hrtime()`.
   * Default is 0. Set via constructor to shift the returned epoch-ms.
   */
  readonly #offsetMs: number;

  /**
   * Property write order: #offsetMs.
   *
   * @param offsetMs - Optional millisecond offset applied to `Date.now()`. Defaults to 0.
   */
  public constructor(offsetMs = 0) {
    if (!Number.isFinite(offsetMs)) {
      throw new ClockError('offsetMs must be a finite number');
    }
    this.#offsetMs = offsetMs;
  }

  /**
   * Extension seam: subclasses may override to replace the raw `Date.now()` source.
   */
  protected readRawMs(): number {
    const result = Date.now();
    return result;
  }

  /**
   * Extension seam: subclasses may override to replace the raw `performance.now()` source.
   */
  protected readRawHrtimeMs(): number {
    const result = performance.now();
    return result;
  }

  /**
   * Extension seam: exposes the constructor-supplied offset to subclasses.
   */
  protected get offsetMs(): number {
    const result = this.#offsetMs;
    return result;
  }

  /**
   * Returns a monotonic nanosecond timestamp derived from `performance.now()`.
   * Not guaranteed to match `Date.now()` — use for elapsed-time measurements only.
   */
  public hrtime(): bigint {
    const ms = this.readRawHrtimeMs() + this.offsetMs;

    return BigInt(Math.round(ms * Number(NS_PER_MS)));
  }

  /** Returns the current wall-clock time in milliseconds since the Unix epoch. */
  public now(): number {
    return this.readRawMs() + this.offsetMs;
  }
}
