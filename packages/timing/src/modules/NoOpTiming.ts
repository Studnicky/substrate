import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingInterface } from '../interfaces/TimingInterface.js';


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
  static create(): NoOpTiming {
    return new this();
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
  getEvents(): Record<string, number> {
    const events: Record<string, number> = { 'durationMs': 0 };
    return events;
  }
}
