import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingStatusEntity } from '../entities/TimingStatusEntity.js';

import { TimingEventInputEntity } from '../entities/TimingEventInputEntity.js';

/**
 * Creates immutable timing event data from one configuration object.
 *
 * @public
 *
 * @example
 * ```typescript
 * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
 *
 * const timing = Timing.create();
 *
 * timing.event(TimingEvent.create({
 *   component: 'GraphAdapter',
 *   operation: 'query'
 * }));
 *
 * // Record event with status
 * timing.event(TimingEvent.create({
 *   component: 'DatabaseAdapter',
 *   operation: 'connect',
 *   status: TIMING_STATUS.START
 * }));
 * ```
 */
export class TimingEvent {
  /**
   * Creates frozen timing event data.
   */
  static create(config: Readonly<{
    'component': string;
    'operation': string;
    'status'?: TimingStatusEntity.Type;
  }>): TimingEventDataEntity.Type {
    const parsed = TimingEventInputEntity.intake(config);
    const event = parsed.status === undefined
      ? `${parsed.component}.${parsed.operation}`
      : `${parsed.component}.${parsed.operation}.${parsed.status}`;

    const result: TimingEventDataEntity.Type = Object.freeze({ 'event': event });
    return result;
  }

  private constructor() {}
}
