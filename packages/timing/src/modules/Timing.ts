import { ConfigurationError } from '@studnicky/config';

import type { TimingOptionsEntity } from '../entities/TimingOptionsEntity.js';
import type { TimingEventDataType } from '../interfaces/TimingEventDataType.js';
import type { TimingInterface } from '../interfaces/TimingInterface.js';

import { DEFAULT_DECIMAL_PRECISION, DEFAULT_MAX_EVENTS, NS_PER_UNIT } from '../constants/index.js';
import { TimingValidator } from '../validation/TimingValidator.js';
import { TimingBuilder } from './TimingBuilder.js';

/**
 * High-resolution timing tracker for collecting operation metrics.
 * Uses process.hrtime.bigint() for nanosecond precision.
 * Events are stored with component.operation[.status] format for CloudWatch filtering.
 *
 * Use Timing.builder().build() to instantiate.
 *
 * @public
 *
 * @example
 * ```typescript
 * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
 *
 * const timing = Timing.builder()
 *   .maxEvents(100)
 *   .precision({ ms: 2 })
 *   .build();
 *
 * // Record events using builder pattern
 * timing.event(TimingEvent.create()
 *   .component('DatabaseAdapter')
 *   .operation('connect')
 *   .status(TIMING_STATUS.START)
 *   .build());
 *
 * timing.event(TimingEvent.create()
 *   .component('GraphAdapter')
 *   .operation('query')
 *   .build());
 *
 * timing.event(TimingEvent.create()
 *   .component('CacheService')
 *   .operation('get')
 *   .status('hit')
 *   .build());
 *
 * timing.event(TimingEvent.create()
 *   .component('DatabaseAdapter')
 *   .operation('connect')
 *   .status(TIMING_STATUS.COMPLETE)
 *   .build());
 *
 * // Get all events as logging context
 * const ctx = timing.getEvents();
 * // {
 * //   'DatabaseAdapter.connect.start': 0.1,
 * //   'GraphAdapter.query': 12.34,
 * //   'CacheService.get.hit': 15.2,
 * //   'DatabaseAdapter.connect.complete': 45.6,
 * //   durationMs: 45.7
 * // }
 * ```
 */
export class Timing implements TimingInterface {
  /**
   * Creates a new TimingBuilder for fluent configuration.
   * Call .build() on the builder to create the Timing instance.
   *
   * @returns A new TimingBuilder instance
   * @throws ConfigurationError - When configuration validation fails (at build time)
   *
   * @example
   * ```typescript
   * import { Timing } from '@studnicky/timing';
   *
   * // Create timing tracker with default options
   * const timing = Timing.builder().build();
   *
   * // Create with LRU cache (max 100 events)
   * const limitedTiming = Timing.builder()
   *   .maxEvents(100)
   *   .build();
   *
   * // Create with custom precision
   * const preciseTiming = Timing.builder()
   *   .precision({ ms: 2 })
   *   .build();
   * ```
   */
  static builder(): TimingBuilder {
    const result = TimingBuilder.create((options: TimingOptionsEntity.Type) => {
      const instance = Timing.create(options);
      return instance;
    });
    return result;
  }

  /**
   * Direct factory method for creating a Timing instance.
   * Subclasses benefit from `new this(options)` so that overrides work correctly.
   *
   * @param options - Timing configuration options
   * @returns A new Timing (or subclass) instance
   *
   * @example
   * ```typescript
   * import { Timing } from '@studnicky/timing';
   *
   * const timing = Timing.create({ maxEvents: 100 });
   * ```
   */
  static create(options: TimingOptionsEntity.Type = {}): Timing {
    return new this(options);
  }

  protected readonly _maxEvents: number;
  protected readonly _precisions: {
    'h': number;
    'm': number;
    'ms': number;
    'ns': number;
    's': number;
  };
  protected readonly _startTime: bigint;

  protected readonly _timingCache: Set<{ 'name': string;
    'timestamp': bigint }>;

  /**
   * Protected constructor. Use Timing.builder().build() to instantiate.
   * Validates configuration and initializes the timing tracker.
   * @param options - Timing configuration options
   * @throws ConfigurationError - When configuration validation fails
   */
  protected constructor(options: TimingOptionsEntity.Type = {}) {
    try {
      // Validate maxEvents BEFORE applying defaults
      if (options.maxEvents !== undefined) {
        TimingValidator.validateMaxEvents(options.maxEvents);
      }

      // Validate precision if provided
      if (options.precision !== undefined) {
        TimingValidator.validatePrecision(options.precision);
      }

      // Apply defaults AFTER validation
      const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;

      // Initialize timing tracker
      this._timingCache = new Set();
      this._maxEvents = maxEvents;

      // Store decimal precisions for math-based rounding
      this._precisions = {
        'h': options.precision?.h ?? DEFAULT_DECIMAL_PRECISION.h,
        'm': options.precision?.m ?? DEFAULT_DECIMAL_PRECISION.m,
        'ms': options.precision?.ms ?? DEFAULT_DECIMAL_PRECISION.ms,
        'ns': options.precision?.ns ?? DEFAULT_DECIMAL_PRECISION.ns,
        's': options.precision?.s ?? DEFAULT_DECIMAL_PRECISION.s
      };

      // Capture start time via overridable hook
      this._startTime = this.readHrtime();

      // Automatically add 'initialize' event
      this._timingCache.add({
        'name': 'initialize',
        'timestamp': this._startTime
      });
    } catch (error) {
      // Re-throw ConfigurationError as-is
      if (error instanceof ConfigurationError) {
        throw error;
      }

      // Wrap other errors as ConfigurationError
      if (error instanceof Error) {
        throw ConfigurationError.create(error.message, error);
      }

      // Unknown error type
      throw ConfigurationError.create(String(error));
    }
  }

  /**
   * Clears all recorded events and destroys the internal timing cache.
   * This purges all memory usage associated with stored events.
   * The timing tracker continues running and can record new events.
   * @returns this for method chaining
   */
  clear(): this {
    this.onClear();
    this._timingCache.clear();

    return this;
  }

  /**
   * Converts nanoseconds to the specified time unit with precision rounding.
   * Uses math-based rounding to configured decimal precision.
   *
   * @param ns - Time in nanoseconds
   * @param unit - Target time unit ('ns', 'ms', 's', 'm', or 'h')
   * @returns Converted and rounded time value as a number
   */
  protected convertTime(ns: bigint, unit: 'h' | 'm' | 'ms' | 'ns' | 's'): number {
    if (unit === 'ns') {
      return Number(ns);
    }

    const rawValue = Number(ns) / NS_PER_UNIT[unit];

    // Apply precision via math rounding
    const precision = this._precisions[unit];
    const factor = Math.pow(10, precision);

    return Math.round(rawValue * factor) / factor;
  }

  /**
   * Records an event using TimingEventDataType.
   * Multiple events with the same name can be recorded.
   * If maxEvents is exceeded, the oldest event is evicted.
   *
   * @param data - Event data from TimingEvent.create().build()
   *
   * @example
   * ```typescript
   * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
   *
   * const timing = Timing.builder().build();
   *
   * // Without status
   * timing.event(TimingEvent.create()
   *   .component('GraphAdapter')
   *   .operation('query')
   *   .build());
   *
   * // With standard status (use TIMING_STATUS constants)
   * timing.event(TimingEvent.create()
   *   .component('DatabaseAdapter')
   *   .operation('connect')
   *   .status(TIMING_STATUS.START)
   *   .build());
   *
   * // With domain-specific status
   * timing.event(TimingEvent.create()
   *   .component('CacheService')
   *   .operation('get')
   *   .status('hit')
   *   .build());
   * ```
   */
  event(data: TimingEventDataType): void {
    const currentTime = this.readHrtime();

    // Check if we need to evict oldest event
    if (this._timingCache.size >= this._maxEvents) {
      const firstEvent = this._timingCache.values().next().value;

      if (firstEvent !== undefined) {
        this.onEvict(firstEvent.name);
        this._timingCache.delete(firstEvent);
      }
    }

    this._timingCache.add({
      'name': data.event,
      'timestamp': currentTime
    });

    this.onEvent(data, currentTime);
  }

  /**
   * Returns all recorded events with their elapsed times.
   * Returns events as a flat JSON object suitable for logging context.
   * If multiple events have the same name, only the most recent is included.
   * Elapsed times are calculated at call time and rounded to configured precision.
   *
   * @returns Record of event names to elapsed times in ms, plus durationMs for total
   *
   * @example
   * ```typescript
   * import { Timing, TimingEvent } from '@studnicky/timing';
   *
   * const timing = Timing.builder().build();
   *
   * timing.event(TimingEvent.create()
   *   .component('GraphAdapter')
   *   .operation('query')
   *   .build());
   *
   * timing.event(TimingEvent.create()
   *   .component('CacheService')
   *   .operation('get')
   *   .build());
   *
   * const ctx = timing.getEvents();
   * // {
   * //   initialize: 0.001,
   * //   'GraphAdapter.query': 12.34,
   * //   'CacheService.get': 15.67,
   * //   durationMs: 15.671
   * // }
   *
   * logger.info(LogBody.create()
   *   .component('ApiController')
   *   .operation('handleResponse')
   *   .status('success')
   *   .message('Request complete')
   *   .context(ctx)
   *   .build());
   * ```
   */
  getEvents(): Record<string, number> {
    const currentTime = this.readHrtime();
    const totalNs = currentTime - this._startTime;
    const durationMs = this.convertTime(totalNs, 'ms');

    const events: Record<string, number> = {};

    for (const event of this._timingCache) {
      const elapsedNs = event.timestamp - this._startTime;

      events[event.name] = this.convertTime(elapsedNs, 'ms');
    }

    events.durationMs = durationMs;

    return events;
  }

  /**
   * Lifecycle hook called before the timing cache is cleared.
   * Subclasses override to react to clear events.
   */
  protected onClear(): void { return; }

  /**
   * Lifecycle hook called after an event is added to the cache.
   * Subclasses override to react to new events.
   *
   * @param _data - The event data that was recorded
   * @param _timestamp - The hrtime timestamp at which the event was recorded
   */
  protected onEvent(_data: TimingEventDataType, _timestamp: bigint): void { return; }

  /**
   * Lifecycle hook called before an event is evicted from the cache.
   * Subclasses override to react to evictions.
   *
   * @param _name - The name of the event being evicted
   */
  protected onEvict(_name: string): void { return; }

  /**
   * Returns the current high-resolution time as a bigint nanosecond value.
   * Subclasses override to inject a virtual or mocked clock.
   *
   * @returns Current time in nanoseconds
   */
  protected readHrtime(): bigint { const result = process.hrtime.bigint();
    return result; }
}
