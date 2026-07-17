/**
 * Deterministic `ClockProvider` for tests.
 * Advance virtual time via `VirtualTimeCounter.advance(ms)`.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';

import type { ClockProviderType } from '../types/ClockProviderType.js';
import type { VirtualTimeCounter } from './VirtualTimeCounter.js';

import { ClockError } from '../errors/ClockError.js';
import { VirtualClockProviderBuilder } from './VirtualClockProviderBuilder.js';

/** Named constant: nanoseconds per millisecond, as BigInt. */
const NS_PER_MS = 1_000_000n;

/**
 * `ClockProvider` backed by a `VirtualTimeCounter`.
 * `now()` returns the counter's current epoch-ms.
 * `hrtime()` returns the same value converted to nanoseconds.
 */
export class VirtualClockProvider implements ClockProviderType {
  static builder(): VirtualClockProviderBuilder {
    const result = VirtualClockProviderBuilder.create((counter) => {
      const provider = VirtualClockProvider.create(counter);
      return provider;
    });
    return result;
  }

  static create(counter: Readonly<VirtualTimeCounter>): VirtualClockProvider {
    return new this(counter);
  }

  readonly #counter: Readonly<VirtualTimeCounter>;

  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Property write order: #counter.
   */
  protected constructor(counter: Readonly<VirtualTimeCounter>) {
    if (!VirtualClockProvider.isValidCounter(counter)) {
      throw new ClockError('counter must be a VirtualTimeCounter instance');
    }
    this.#counter = counter;
  }

  private static isValidCounter(counter: unknown): counter is Readonly<VirtualTimeCounter> {
    return (
      typeof counter === 'object' &&
      counter !== null &&
      typeof (counter as VirtualTimeCounter).nowMs === 'function' &&
      typeof (counter as VirtualTimeCounter).advance === 'function'
    );
  }

  /**
   * Extension seam: exposes the injected counter to subclasses without widening
   * the public API surface.
   */
  protected get counter(): Readonly<VirtualTimeCounter> {
    const result = this.#counter;
    return result;
  }

  /**
   * Extension seam: subclasses may override to replace or instrument the raw
   * virtual ms value before it is consumed by `hrtime()` and `now()`.
   */
  protected readVirtualMs(): number {
    const result = this.#counter.nowMs();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /**
   * Fires after each `now()` call, with the virtual epoch-ms value (clamped
   * to 0 if the counter is negative) that was returned to the caller. A
   * throwing override surfaces as a `HookInvocationError` from `now()`.
   */
  protected onNow(_timestamp: number): void {}

  /**
   * Fires after each `hrtime()` call, with the virtual nanosecond bigint
   * value that was returned to the caller. A throwing override surfaces as a
   * `HookInvocationError` from `hrtime()`.
   */
  protected onHrtime(_value: bigint): void {}

  /** Returns the virtual time in nanoseconds (epoch-ms * 1,000,000). */
  public hrtime(): bigint {
    const result = BigInt(this.readVirtualMs()) * NS_PER_MS;

    this.hooks.invoke('onHrtime', () => {
      const hookResult = this.onHrtime(result);
      return hookResult;
    });
    return result;
  }

  /** Returns the virtual epoch-ms (always non-negative). */
  public now(): number {
    const ms = this.readVirtualMs();
    const result = ms >= 0 ? ms : 0;

    this.hooks.invoke('onNow', () => {
      const hookResult = this.onNow(result);
      return hookResult;
    });
    return result;
  }
}
