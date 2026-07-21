import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingStatusEntity } from '../entities/TimingStatusEntity.js';

import { TimingBuildError } from '../errors/TimingBuildError.js';

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
    if (config.component === undefined) {
      throw TimingBuildError.create('TimingEvent requires component');
    }

    if (config.operation === undefined) {
      throw TimingBuildError.create('TimingEvent requires operation');
    }

    const event = config.status === undefined
      ? `${config.component}.${config.operation}`
      : `${config.component}.${config.operation}.${config.status}`;

    return Object.freeze({ 'event': event });
  }

  private constructor() {}
}
