/**
 * `Throttle` subclass whose `now()` reads a virtual clock instead of the wall
 * clock, so adaptive-concurrency tests can drive operation latency
 * deterministically without patching global `Date.now`.
 *
 * @module
 */

import { Clock, VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

import type { ThrottleConfigEntity } from '../../src/entities/ThrottleConfigEntity.js';

import { Throttle } from '../../src/index.js';

/**
 * Fixed per-operation timing driving a `VirtualClockThrottle`'s virtual
 * clock: `startMs` seeds the counter, `advanceOperationStart()` moves it by
 * `operationSpacingMs`, and `advanceOperationDuration()` moves it by
 * `operationDurationMs`.
 */
export interface ThrottleClockInputInterface {
  operationDurationMs: number;
  operationSpacingMs: number;
  startMs: number;
}

interface VirtualClockThrottleSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class VirtualClockThrottleInstance {
  static belongsTo<TInstance>(
    constructor: VirtualClockThrottleSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    return value instanceof constructor;
  }
}

/**
 * `Throttle` subclass backed by a `VirtualTimeCounter`. `now()` reads the
 * counter's current epoch-ms rather than `Date.now()`. Subclasses that need
 * their own lifecycle-hook overrides (e.g. observing `onAdaptiveAdjust`)
 * extend this class directly and inherit its protected constructor.
 */
export class VirtualClockThrottle extends Throttle {
  static createWithClock<TInstance extends VirtualClockThrottle = VirtualClockThrottle>(
    this: VirtualClockThrottleSubclassInterface<TInstance>,
    input: ThrottleClockInputInterface,
    config?: Partial<ThrottleConfigEntity.Type>
  ): TInstance {
    const result: unknown = Reflect.construct(this, [config, input]);
    if (!VirtualClockThrottleInstance.belongsTo(this, result)) {
      throw new TypeError('VirtualClockThrottle.createWithClock() did not construct the requested subclass.');
    }
    return result;
  }

  readonly #clock: Clock;
  readonly #counter: VirtualTimeCounter;
  readonly #input: ThrottleClockInputInterface;

  /**
   * Property write order: #input, #counter, #clock.
   */
  protected constructor(config: Partial<ThrottleConfigEntity.Type> | undefined, input: ThrottleClockInputInterface) {
    super(config);
    this.#input = input;
    this.#counter = VirtualTimeCounter.create({ startMs: input.startMs });
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
