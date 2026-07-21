/**
 * @packageDocumentation
 * High-resolution timing tracker for collecting operation metrics.
 * Uses process.hrtime.bigint() for nanosecond precision.
 * Events are stored with component.operation format for CloudWatch filtering.
 *
 * @example
 * ```typescript
 * import { Timing, TimingEvent, TIMING_STATUS } from '@studnicky/timing';
 *
 * const timing = Timing.create({ 'maxEvents': 100 });
 *
 * // Record immutable event data
 * timing.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
 *
 * timing.event(TimingEvent.create({ 'component': 'DatabaseAdapter', 'operation': 'connect', 'status': TIMING_STATUS.START }));
 *
 * // Get all events as logging context
 * const ctx = timing.getEvents();
 * // { initialize: 0, 'GraphAdapter.query': 12.34, 'DatabaseAdapter.connect.start': 15.67, durationMs: 15.671 }
 * ```
 */

/** Standard timing status constants */
export { TIMING_STATUS } from './constants/index.js';

/** Supported timing unit entity with schema and validation */
export { TimeUnitEntity } from './entities/TimeUnitEntity.js';

/** Timing event data entity with schema and validation */
export { TimingEventDataEntity } from './entities/TimingEventDataEntity.js';

/** Timing options entity with schema and validation */
export { TimingOptionsEntity } from './entities/TimingOptionsEntity.js';

/** Timing precision entity with schema and validation */
export { TimingPrecisionEntity } from './entities/TimingPrecisionEntity.js';

/** Timing event status entity with schema and validation */
export { TimingStatusEntity } from './entities/TimingStatusEntity.js';

/** Error thrown when building a timing event fails validation */
export { TimingBuildError } from './errors/TimingBuildError.js';

/** Public contract implemented by timing trackers */
export type { TimingInterface } from './interfaces/TimingInterface.js';

/** No-operation timing tracker class */
export { NoOpTiming } from './modules/NoOpTiming.js';

/** High-resolution timing tracker class */
export { Timing } from './modules/Timing.js';

/** Immutable timing event data factory */
export { TimingEvent } from './modules/TimingEvent.js';

/** Static validation methods for timing configuration values */
export { TimingValidator } from './validation/TimingValidator.js';
