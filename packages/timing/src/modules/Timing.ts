import { ConfigurationError } from '@studnicky/config';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { TimeUnitEntity } from '../entities/TimeUnitEntity.js';
import type { TimingEventDataEntity } from '../entities/TimingEventDataEntity.js';
import type { TimingInterface } from '../interfaces/TimingInterface.js';

import { DEFAULT_MAXIMUM_EVENTS, NS_PER_UNIT } from '../constants/index.js';
import { TimingOptionsEntity } from '../entities/TimingOptionsEntity.js';

class TimingInstance {
  static construct(constructor: Function, argumentsList: readonly object[]): object {
    const result: unknown = Reflect.construct(constructor, argumentsList);
    if (!Predicates.isObjectLike(result)) {
      throw new TypeError('Timing.create() did not construct an object.');
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
 * High-resolution timing tracker for collecting operation metrics.
 * Uses process.hrtime.bigint() for nanosecond precision.
 * Events are stored with component.operation[.status] format for CloudWatch filtering.
 *
 * Use Timing.create() to instantiate.
 *
 * @public
 *
 * @example
 * ```typescript
 * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
 *
 * const timing = Timing.create();
 *
 * // Record immutable event data
 * timing.event(TimingEvent.create({ 'component': 'DatabaseAdapter', 'operation': 'connect', 'status': TIMING_STATUS.START }));
 *
 * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
 *
 * timing.event(TimingEvent.create({ 'component': 'CacheService', 'operation': 'get', 'status': 'hit' }));
 *
 * timing.event(TimingEvent.create({ 'component': 'DatabaseAdapter', 'operation': 'connect', 'status': TIMING_STATUS.COMPLETE }));
 *
 * // Get all events as logging context
 * const ctx = timing.getEvents();
 * // Map(5) {
 * //   'DatabaseAdapter.connect.start' => 0.1,
 * //   'GraphAdapter.query' => 12.34,
 * //   'CacheService.get.hit' => 15.2,
 * //   'DatabaseAdapter.connect.complete' => 45.6,
 * //   'durationMs' => 45.7
 * // }
 * ```
 */
export class Timing implements TimingInterface {
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
   * const timing = Timing.create();
   * ```
   */
  static create<TInstance extends Timing = Timing>(
    this: Function & { readonly 'prototype': TInstance; },
    options: Parameters<typeof TimingOptionsEntity.create>[0] = {}
  ): TInstance {
    const result = TimingInstance.construct(this, [options]);
    if (!TimingInstance.belongsTo<TInstance>(this, result)) {
      throw new TypeError('Timing.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  protected readonly maximumEvents: number;
  readonly #precisions: ReadonlyMap<TimeUnitEntity.Type, number>;
  readonly #nanosecondsPerUnit: ReadonlyMap<TimeUnitEntity.Type, number>;
  protected readonly startTime: bigint;

  readonly #timingCache: Set<{ 'name': string;
    'timestamp': bigint }>;

  /**
   * Protected constructor. Use Timing.create() to instantiate.
   * Validates configuration and initializes the timing tracker.
   * @param options - Timing configuration options
   * @throws ConfigurationError - When configuration validation fails
   * @throws HookInvocationError - When the onInitialize hook throws
   */
  protected constructor(options: Parameters<typeof TimingOptionsEntity.create>[0] = {}) {
    try {
      const timingOptions = TimingOptionsEntity.create(options);
      const maximumEventCount = timingOptions.maximumEvents ?? DEFAULT_MAXIMUM_EVENTS;

      this.#timingCache = new Set();
      this.maximumEvents = maximumEventCount;

      this.#precisions = new Map([
        ['h', timingOptions.precision.h],
        ['m', timingOptions.precision.m],
        ['ms', timingOptions.precision.ms],
        ['ns', timingOptions.precision.ns],
        ['s', timingOptions.precision.s]
      ]);
      this.#nanosecondsPerUnit = new Map([
        ['h', NS_PER_UNIT.h],
        ['m', NS_PER_UNIT.m],
        ['ms', NS_PER_UNIT.ms],
        ['ns', 1],
        ['s', NS_PER_UNIT.s]
      ]);

      this.startTime = this.readHrtime();

      this.#timingCache.add({
        'name': 'initialize',
        'timestamp': this.startTime
      });

      this.hooks.invoke('onInitialize', () => {
        const result = this.onInitialize(this.startTime);
        return result;
      });
    } catch (error) {
      // Re-throw ConfigurationError and HookInvocationError as-is
      if (error instanceof ConfigurationError || error instanceof HookInvocationError) {
        throw error;
      }

      // Wrap other errors as ConfigurationError
      if (Predicates.isError(error)) {
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
    this.hooks.invoke('onClear', () => {
      const result = this.onClear();
      return result;
    });
    this.#timingCache.clear();

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
  protected convertTime(ns: bigint, unit: TimeUnitEntity.Type): number {
    if (unit === 'ns') {
      const result = Number(ns);
      return result;
    }

    const nanosecondsPerUnit = this.#nanosecondsPerUnit.get(unit);
    const precision = this.#precisions.get(unit);
    if (nanosecondsPerUnit === undefined || precision === undefined) {
      throw new RangeError(`Unsupported time unit: ${unit}`);
    }

    const rawValue = Number(ns) / nanosecondsPerUnit;
    const factor = Math.pow(10, precision);

    const result = Math.round(rawValue * factor) / factor;
    return result;
  }

  /**
   * Records an event using TimingEventDataEntity.Type.
   * Multiple events with the same name can be recorded.
   * If maximumEvents is exceeded, the oldest event is evicted.
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
   * // With standard status (use TIMING_STATUS constants)
   * timing.event(TimingEvent.create({ 'component': 'DatabaseAdapter', 'operation': 'connect', 'status': TIMING_STATUS.START }));
   *
   * // With domain-specific status
   * timing.event(TimingEvent.create({ 'component': 'CacheService', 'operation': 'get', 'status': 'hit' }));
   * ```
   */
  event(data: TimingEventDataEntity.Type): void {
    const currentTime = this.readHrtime();

    if (this.#timingCache.size >= this.maximumEvents) {
      // maximumEvents is validated to be >= 1 by TimingOptionsEntity, so
      // size >= maximumEvents >= 1 here, meaning the cache is non-empty and the
      // iterator always yields a value.
      const firstEvent = this.#timingCache.values().next().value!;

      this.hooks.invoke('onEvict', () => {
        const result = this.onEvict(firstEvent.name);
        return result;
      });
      this.#timingCache.delete(firstEvent);
    }

    this.#timingCache.add({
      'name': data.event,
      'timestamp': currentTime
    });

    this.hooks.invoke('onEvent', () => {
      const result = this.onEvent(data, currentTime);
      return result;
    });
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
   * const timing = Timing.create();
   *
   * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
   *
   * timing.event(TimingEvent.create({ 'component': 'CacheService', 'operation': 'get' }));
   *
   * const ctx = timing.getEvents();
   * // Map(4) {
   * //   'initialize' => 0.001,
   * //   'GraphAdapter.query' => 12.34,
   * //   'CacheService.get' => 15.67,
   * //   'durationMs' => 15.671
   * // }
   *
   * logger.info(LogBody.create({
   *   component: 'ApiController',
   *   context: ctx,
   *   message: 'Request complete',
   *   operation: 'handleResponse',
   *   status: 'success'
   * }));
   * ```
   */
  getEvents(): ReadonlyMap<string, number> {
    this.hooks.invoke('onGetEvents', () => {
      const result = this.onGetEvents(this.#timingCache.size);
      return result;
    });

    const currentTime = this.readHrtime();
    const totalNs = currentTime - this.startTime;
    const durationMs = this.convertTime(totalNs, 'ms');

    // A Map, not a plain object. Event names are runtime values, and assigning runtime
    // string keys to a plain object drives it out of fast properties into dictionary mode
    // (`%HasFastProperties` -> false after ~200 dynamic keys). `prefer-collection-types`
    // and `v8/dynamic-property-access` both point here, and a Map is also the honest type:
    // the key set is not statically known.
    const events = new Map<string, number>();

    for (const event of this.#timingCache) {
      const elapsedNs = event.timestamp - this.startTime;

      events.set(event.name, this.convertTime(elapsedNs, 'ms'));
    }

    events.set('durationMs', durationMs);

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
  protected onEvent(_data: TimingEventDataEntity.Type, _timestamp: bigint): void { return; }

  /**
   * Lifecycle hook called before an event is evicted from the cache.
   * Subclasses override to react to evictions.
   *
   * @param _name - The name of the event being evicted
   */
  protected onEvict(_name: string): void { return; }

  /** Fires after the instance is fully initialized. _startTime is the hrtime bigint captured at creation. */
  protected onInitialize(_startTime: bigint): void { return; }

  /** Fires at the start of each getEvents() call, before computing elapsed times. _eventCount is the number of entries in the cache at that moment. */
  protected onGetEvents(_eventCount: number): void { return; }

  /**
   * Returns the current high-resolution time as a bigint nanosecond value.
   * Subclasses override to inject a virtual or mocked clock.
   *
   * @returns Current time in nanoseconds
   */
  protected readHrtime(): bigint {
    const result = process.hrtime.bigint();
    return result;
  }

}
