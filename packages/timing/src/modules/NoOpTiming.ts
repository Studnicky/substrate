import { Predicates } from '@studnicky/types';

import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingInterface } from '../interfaces/TimingInterface.js';


class NoOpTimingInstance {
  static construct(constructor: Function): object {
    const result: unknown = Reflect.construct(constructor, []);
    if (!Predicates.isObjectLike(result)) {
      throw new TypeError('NoOpTiming.create() did not construct an object.');
    }
    return result;
  }

  // `TInstance` flows into BOTH the constructor parameter and the predicate, so it is inferred
  // from the constructor rather than being a phantom generic supplied only at the call site.
  static belongsTo<TInstance extends object>(constructor: Function & { readonly 'prototype': TInstance }, value: object): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

/**
 * No-operation timing tracker that discards all events.
 *
 * Useful for:
 * - Testing when you don't want timing overhead
 * - Production environments where timing is disabled
 * - Libraries that want a default silent timer
 *
 * @public
 *
 * @example
 * ```typescript
 * import { NoOpTiming, TimingEvent } from '@studnicky/timing';
 *
 * const timing = NoOpTiming.create();
 *
 * // All timing calls are ignored
 * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
 *
 * timing.getEvents(); // Returns { durationMs: 0 }
 * ```
 */
export class NoOpTiming implements TimingInterface {
  /**
   * Creates a new NoOpTiming instance.
   * @returns A new NoOpTiming instance
   *
   * @example
   * ```typescript
   * import { NoOpTiming, TimingEvent } from '@studnicky/timing';
   *
   * const timing = NoOpTiming.create();
   *
   * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' })); // Does nothing
   * ```
   */
  static create<TInstance extends NoOpTiming = NoOpTiming>(
    this: Function & { readonly 'prototype': TInstance; }
  ): TInstance {
    const result = NoOpTimingInstance.construct(this);
    if (!NoOpTimingInstance.belongsTo<TInstance>(this, result)) {
      throw new TypeError('NoOpTiming.create() did not construct the requested subclass.');
    }
    return result;
  }

  /**
   * Protected constructor. Use NoOpTiming.create() to instantiate.
   */
  protected constructor() {}

  /**
   * No-operation clear method.
   * @returns this for method chaining
   */
  clear(): this {
    return this;
  }

  /**
   * No-operation event method.
   *
   * @param _data - Ignored event data
   */
  event(_data: TimingEventDataEntity.Type): void {
    // No-op
  }

  /**
   * No-operation getEvents method.
   *
   * @returns Empty events with zero duration
   */
  getEvents(): ReadonlyMap<string, number> {
    const events = new Map<string, number>([['durationMs', 0]]);
    return events;
  }
}
