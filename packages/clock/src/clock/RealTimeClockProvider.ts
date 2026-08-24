/**
 * Default `ClockProvider` implementation using `Date.now()` and `performance.now()`.
 * Browser-safe and Node-safe — both APIs are available in ES2023+ environments.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { ClockProviderInterface } from '../interfaces/ClockProviderInterface.js';

import { RealTimeClockProviderOptionsEntity } from '../entities/RealTimeClockProviderOptionsEntity.js';
/** Named constant: nanoseconds per millisecond (as BigInt). */
const NS_PER_MS = 1_000_000n;

interface RealTimeClockProviderSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class RealTimeClockProviderInstance {
  static belongsTo<TInstance extends object>(constructor: RealTimeClockProviderSubclassInterface<TInstance>, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * Concrete `ClockProvider` backed by `Date.now()` and `performance.now()`.
 * Supports an optional epoch offset for clock-skew correction.
 */
export class RealTimeClockProvider implements ClockProviderInterface {
  static create<TInstance extends RealTimeClockProvider = RealTimeClockProvider>(
    this: RealTimeClockProviderSubclassInterface<TInstance>,
    options: Partial<RealTimeClockProviderOptionsEntity.Type> = {}
  ): TInstance {
    const resolvedOptions = RealTimeClockProviderOptionsEntity.intake(options);
    const result: unknown = Reflect.construct(this, [resolvedOptions]);
    if (!Guard.isObjectLike(result) || !RealTimeClockProviderInstance.belongsTo(this, result)) {
      throw new TypeError('RealTimeClockProvider.create() did not construct the requested subclass.');
    }
    return result;
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
    this.#offsetMs = options.offsetMs;
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
    const ms = performance.now() + this.offsetMs;

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
    const result = Date.now() + this.offsetMs;

    this.hooks.invoke('onNow', () => {
      const hookResult = this.onNow(result);
      return hookResult;
    });
    return result;
  }
}
