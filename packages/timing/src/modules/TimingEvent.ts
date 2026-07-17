import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingEventInterface } from '../interfaces/TimingEventInterface.js';
import type { TimingStatusValueType } from '../types/TimingStatusValueType.js';

import { TimingBuildError } from '../errors/TimingBuildError.js';

/**
 * Builder for creating timing event data.
 * Use TimingEvent.create() to instantiate.
 *
 * @public
 *
 * @example
 * ```typescript
 * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
 *
 * const timing = Timing.builder().build();
 *
 * // Record event with builder
 * timing.event(TimingEvent.create()
 *   .component('GraphAdapter')
 *   .operation('query')
 *   .build());
 *
 * // Record event with status
 * timing.event(TimingEvent.create()
 *   .component('DatabaseAdapter')
 *   .operation('connect')
 *   .status(TIMING_STATUS.START)
 *   .build());
 * ```
 */
export class TimingEvent implements TimingEventInterface {
  /**
   * Creates a new TimingEvent builder.
   * @returns A new TimingEvent builder instance
   */
  static create(): TimingEvent {
    const result = new TimingEvent();
    return result;
  }

  private componentValue: string | undefined;

  private operationValue: string | undefined;

  private statusValue: TimingStatusValueType | undefined;

  private constructor() {}

  /**
   * Builds the timing event data.
   * Validates that required fields (component, operation) are set.
   * @throws TimingBuildError if component or operation is missing
   * @returns Frozen TimingEventDataEntity.Type
   */
  build(): TimingEventDataEntity.Type {
    if (this.componentValue === undefined) {
      throw TimingBuildError.create('TimingEvent requires component()');
    }

    if (this.operationValue === undefined) {
      throw TimingBuildError.create('TimingEvent requires operation()');
    }

    const event = this.statusValue === undefined
      ? `${this.componentValue}.${this.operationValue}`
      : `${this.componentValue}.${this.operationValue}.${this.statusValue}`;

    return Object.freeze({ 'event': event });
  }

  /**
   * Sets the component name.
   * @param name - Component name (e.g., 'graph', 'cache', 'api')
   * @returns this for method chaining
   */
  component(name: string): this {
    this.componentValue = name;

    return this;
  }

  /**
   * Sets the operation name.
   * @param name - Operation name (e.g., 'query', 'get', 'response')
   * @returns this for method chaining
   */
  operation(name: string): this {
    this.operationValue = name;

    return this;
  }

  /**
   * Sets the optional status from TIMING_STATUS constants.
   * @param status - Status from TIMING_STATUS (e.g., TIMING_STATUS.START, TIMING_STATUS.COMPLETE)
   * @returns this for method chaining
   */
  status(status: TimingStatusValueType): this {
    this.statusValue = status;

    return this;
  }
}
