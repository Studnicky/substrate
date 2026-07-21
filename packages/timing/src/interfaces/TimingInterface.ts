import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';

/**
 * Interface defining the public API of a Timing instance.
 *
 * @public
 */
export interface TimingInterface {
  /**
   * Clears all recorded events.
   * @returns this for method chaining
   */
  clear(): this;

  /**
   * Records an event using TimingEventDataEntity.Type.
   *
   * @param data - Immutable event data from TimingEvent.create()
   *
   * @example
   * ```typescript
   * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
   *
   * const timing = Timing.create();
   *
   * // Without status
   * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
   *
   * // With status
   * timing.event(TimingEvent.create({ 'component': 'DatabaseAdapter', 'operation': 'connect', 'status': TIMING_STATUS.START }));
   * ```
   */
  event(data: TimingEventDataEntity.Type): void;

  /**
   * Returns all recorded events with their elapsed times.
   *
   * @returns Record of event names to elapsed times in ms, plus durationMs for total
   */
  getEvents(): Record<string, number>;
}
