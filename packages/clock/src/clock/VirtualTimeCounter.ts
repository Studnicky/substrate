/**
 * Shared mutable counter for virtual time.
 * Pass the same instance to both `VirtualClockProvider` and a virtual scheduler
 * so `Clock.now()` and task fires stay in sync.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';

import { VirtualTimeCounterOptionsEntity } from '../entities/VirtualTimeCounterOptionsEntity.js';
import { ClockError } from '../errors/ClockError.js';

interface VirtualTimeCounterSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class VirtualTimeCounterInstance {
  static belongsTo<TInstance>(
    constructor: VirtualTimeCounterSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    return value instanceof constructor;
  }
}

/**
 * Mutable counter that tracks virtual epoch-ms for test scenarios.
 * Call `advance(ms)` to move time forward; all paired `VirtualClockProvider`
 * instances see the change immediately.
 */
export class VirtualTimeCounter {
  static create<TInstance extends VirtualTimeCounter = VirtualTimeCounter>(
    this: VirtualTimeCounterSubclassInterface<TInstance>,
    options: VirtualTimeCounterOptionsEntity.Type = {}
  ): TInstance {
    const result: unknown = Reflect.construct(this, [options]);
    if (!VirtualTimeCounterInstance.belongsTo(this, result)) {
      throw new TypeError('VirtualTimeCounter.create() did not construct the requested subclass.');
    }
    return result;
  }

  /** Current virtual epoch-ms. Must be non-negative. */
  #nowMs: number;

  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Property write order: #nowMs.
   */
  protected constructor(options: VirtualTimeCounterOptionsEntity.Type) {
    if (!VirtualTimeCounterOptionsEntity.validate(options)) {
      throw new ClockError('invalid VirtualTimeCounter options');
    }
    const resolved = options.startMs ?? 0;
    if (!Number.isFinite(resolved) || resolved < 0) {
      throw new ClockError('startMs must be a finite non-negative number');
    }
    this.#nowMs = resolved;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /**
   * Fires after a successful `advance()` call (positive delta only), with the
   * applied delta and the resulting epoch-ms after the advance. A throwing
   * override surfaces as a `HookInvocationError` from `advance()`.
   */
  protected onAdvance(_deltaMs: number, _nowMs: number): void {}

  /**
   * Fires after each `nowMs()` call, with the current virtual epoch-ms value
   * that was returned to the caller. A throwing override surfaces as a
   * `HookInvocationError` from `nowMs()`.
   */
  protected onNowMs(_value: number): void {}

  /**
   * Advances virtual time by `deltaMs` milliseconds.
   * No-ops if `deltaMs` is negative or zero.
   */
  public advance(deltaMs: number): void {
    if (deltaMs <= 0) {
      return;
    }
    this.#nowMs = this.#nowMs + deltaMs;
    this.hooks.invoke('onAdvance', () => {
      const result = this.onAdvance(deltaMs, this.#nowMs);
      return result;
    });
  }

  /** Returns the current virtual epoch-ms (always non-negative). */
  public nowMs(): number {
    const result = this.#nowMs;
    this.hooks.invoke('onNowMs', () => {
      const hookResult = this.onNowMs(result);
      return hookResult;
    });
    return result;
  }
}
