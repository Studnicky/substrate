/**
 * Default `ClockProvider` implementation using `Date.now()` and `performance.now()`.
 * Browser-safe and Node-safe — both APIs are available in ES2023+ environments.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';

import type { ClockProviderType } from '../types/ClockProviderType.js';

import { RealTimeClockProviderOptionsEntity } from '../entities/RealTimeClockProviderOptionsEntity.js';
import { ClockError } from '../errors/ClockError.js';
import { RealTimeClockProviderBuilder } from './RealTimeClockProviderBuilder.js';

/** Named constant: nanoseconds per millisecond (as BigInt). */
const NS_PER_MS = 1_000_000n;

/**
 * Concrete `ClockProvider` backed by `Date.now()` and `performance.now()`.
 * Supports an optional epoch offset for clock-skew correction.
 */
export class RealTimeClockProvider implements ClockProviderType {
  static builder(): RealTimeClockProviderBuilder {
    const result = RealTimeClockProviderBuilder.create((options) => {
      const provider = RealTimeClockProvider.create(options);
      return provider;
    });
    return result;
  }

  static create(options: RealTimeClockProviderOptionsEntity.Type = {}): RealTimeClockProvider {
    return new this(options);
  }

  /**
   * Optional epoch offset applied to `now()` and `hrtime()`.
   * Default is 0. Set via options to shift the returned epoch-ms.
   */
  readonly #offsetMs: number;

  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Property write order: #offsetMs.
   */
  protected constructor(options: RealTimeClockProviderOptionsEntity.Type) {
    if (!RealTimeClockProviderOptionsEntity.validate(options)) {
      throw new ClockError('invalid RealTimeClockProvider options');
    }
    const resolved = options.offsetMs ?? 0;
    if (!Number.isFinite(resolved)) {
      throw new ClockError('offsetMs must be a finite number');
    }
    this.#offsetMs = resolved;
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

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /**
   * Fires after each `now()` call, with the final epoch-ms value (raw + offset)
   * that was returned to the caller. A throwing override surfaces as a
   * `HookInvocationError` from `now()`.
   */
  protected onNow(_timestamp: number): void {}

  /**
   * Fires after each `hrtime()` call, with the final nanosecond bigint value
   * (derived from performance.now() + offset) that was returned to the caller.
   * A throwing override surfaces as a `HookInvocationError` from `hrtime()`.
   */
  protected onHrtime(_value: bigint): void {}

  /**
   * Returns a monotonic nanosecond timestamp derived from `performance.now()`.
   * Not guaranteed to match `Date.now()` — use for elapsed-time measurements only.
   */
  public hrtime(): bigint {
    const ms = this.readRawHrtimeMs() + this.offsetMs;

    // Split into whole-millisecond and fractional-millisecond parts before
    // converting to BigInt. Multiplying the full `ms` value by 1e6 as a
    // `Number` loses integer-nanosecond precision once the product exceeds
    // `Number.MAX_SAFE_INTEGER` (~104 days of `performance.now()` uptime).
    // The fractional remainder stays well within `Number` precision, so only
    // it is multiplied as a float; the whole-ms part is scaled via BigInt.
    const wholeMs = Math.trunc(ms);
    const fractionalMs = ms - wholeMs;
    const result = BigInt(wholeMs) * NS_PER_MS + BigInt(Math.round(fractionalMs * Number(NS_PER_MS)));

    this.hooks.invoke('onHrtime', () => {
      const hookResult = this.onHrtime(result);
      return hookResult;
    });
    return result;
  }

  /** Returns the current wall-clock time in milliseconds since the Unix epoch. */
  public now(): number {
    const result = this.readRawMs() + this.offsetMs;

    this.hooks.invoke('onNow', () => {
      const hookResult = this.onNow(result);
      return hookResult;
    });
    return result;
  }
}
