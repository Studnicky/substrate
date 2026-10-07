/**
 * `Throttle` subclass whose `now()` reads a virtual clock instead of the wall
 * clock, so adaptive-concurrency tests can drive operation latency
 * deterministically without patching global `Date.now`.
 *
 * @module
 */

import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';

import type { ThrottleClockInputInterface } from './ThrottleClockInputInterface.js';

import { Throttle } from '../../src/throttle/index.js';

/**
 * `Throttle` subclass backed by a `VirtualTimeCounter`. `now()` reads the
 * counter's current epoch-ms rather than `Date.now()`. Subclasses that need
 * their own lifecycle-hook overrides (e.g. observing `onAdaptiveAdjust`)
 * extend this class directly and inherit its protected constructor.
 */
export class VirtualClockThrottle extends Throttle {
  static createWithClock(
    this: typeof VirtualClockThrottle,
    input: ThrottleClockInputInterface,
    config?: unknown
  ): VirtualClockThrottle {
    const throttle = new this(config, input);
    return throttle;
  }

  readonly #clock: Clock;
  readonly #counter: VirtualTimeCounter;
  readonly #input: ThrottleClockInputInterface;

  /**
   * Property write order: #input, #counter, #clock.
   */
  protected constructor(config: unknown, input: ThrottleClockInputInterface) {
    super(config);
    this.#input = input;
    this.#counter = VirtualTimeCounter.create({ 'startMs': input.startMs });
    this.#clock = Clock.create(VirtualClockProvider.create(this.#counter));
  }

  protected override now(): number {
    const result = this.#clock.now();
    return result;
  }

  /** Advances the virtual clock by `operationDurationMs`. */
  advanceOperationDuration(): void {
    this.#counter.advance(this.#input.operationDurationMs);
  }

  /** Advances the virtual clock by `operationSpacingMs`. */
  advanceOperationStart(): void {
    this.#counter.advance(this.#input.operationSpacingMs);
  }
}
