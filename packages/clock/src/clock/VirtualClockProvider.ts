/**
 * Deterministic `ClockProvider` for tests.
 * Advance virtual time via `VirtualTimeCounter.advance(ms)`.
 *
 * @module
 */

import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { ClockProviderInterface } from '../interfaces/ClockProviderInterface.js';
import type { VirtualTimeCounter } from './VirtualTimeCounter.js';

import { ClockError } from '../errors/ClockError.js';

/** Named constant: nanoseconds per millisecond, as BigInt. */
const NS_PER_MS = 1_000_000n;

interface VirtualClockProviderSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class VirtualClockProviderInstance {
  static belongsTo<TInstance extends object>(constructor: VirtualClockProviderSubclassInterface<TInstance>, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * `ClockProvider` backed by a `VirtualTimeCounter`.
 * `now()` returns the counter's current epoch-ms.
 * `hrtime()` returns the same value converted to nanoseconds.
 */
export class VirtualClockProvider implements ClockProviderInterface {
  static create<TInstance extends VirtualClockProvider = VirtualClockProvider>(
    this: VirtualClockProviderSubclassInterface<TInstance>,
    counter: Readonly<VirtualTimeCounter>
  ): TInstance {
    const result: unknown = Reflect.construct(this, [counter]);
    if (!Predicates.isObjectLike(result) || !VirtualClockProviderInstance.belongsTo(this, result)) {
      throw RuntimeError.create('VirtualClockProvider.create() did not construct the requested subclass.');
    }
    return result;
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

  private static isValidCounter(counter: Readonly<VirtualTimeCounter>): boolean {
    const result = Predicates.isFunction(counter.nowMs) && Predicates.isFunction(counter.advance);
    return result;
  }

  /**
   * Extension seam: exposes the injected counter to subclasses without widening
   * the public API surface.
   */
  protected get counter(): Readonly<VirtualTimeCounter> {
    const result = this.#counter;
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
    const result = BigInt(this.#counter.nowMs()) * NS_PER_MS;

    this.hooks.invoke('onHrtime', () => {
      const hookResult = this.onHrtime(result);
      return hookResult;
    });
    return result;
  }

  /** Returns the virtual epoch-ms (always non-negative). */
  public now(): number {
    const ms = this.#counter.nowMs();
    const result = ms >= 0 ? ms : 0;

    this.hooks.invoke('onNow', () => {
      const hookResult = this.onNow(result);
      return hookResult;
    });
    return result;
  }
}
