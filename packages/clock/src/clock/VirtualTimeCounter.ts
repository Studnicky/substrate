/**
 * Shared mutable counter for virtual time.
 * Pass the same instance to both `VirtualClockProvider` and a virtual scheduler
 * so `Clock.now()` and task fires stay in sync.
 *
 * @module
 */

import { VirtualTimeCounterOptionsEntity } from '../entities/VirtualTimeCounterOptionsEntity.js';
import { ClockError } from '../errors/ClockError.js';
import { VirtualTimeCounterBuilder } from './VirtualTimeCounterBuilder.js';

/**
 * Mutable counter that tracks virtual epoch-ms for test scenarios.
 * Call `advance(ms)` to move time forward; all paired `VirtualClockProvider`
 * instances see the change immediately.
 */
export class VirtualTimeCounter {
  static builder(): VirtualTimeCounterBuilder {
    const result = VirtualTimeCounterBuilder.create((options) => {
      const counter = VirtualTimeCounter.create(options);
      return counter;
    });
    return result;
  }

  static create(options: VirtualTimeCounterOptionsEntity.Type = {}): VirtualTimeCounter {
    return new this(options);
  }

  /** Current virtual epoch-ms. Must be non-negative. */
  #nowMs: number;

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

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /**
   * Fires after a successful `advance()` call (positive delta only), with the
   * applied delta and the resulting epoch-ms after the advance.
   */
  protected onAdvance(_deltaMs: number, _nowMs: number): void {}

  /**
   * Fires after each `nowMs()` call, with the current virtual epoch-ms value
   * that was returned to the caller.
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
    this.#invokeHook(() => {
      this.onAdvance(deltaMs, this.#nowMs);
    });
  }

  /** Returns the current virtual epoch-ms (always non-negative). */
  public nowMs(): number {
    const result = this.#nowMs;
    this.#invokeHook(() => {
      this.onNowMs(result);
    });
    return result;
  }
}
