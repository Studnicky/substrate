/**
 * Error classes for the timing package.
 */

/** Error thrown when building a timing event fails validation */
export { TimingBuildError } from './TimingBuildError.js';

/** Error thrown when a host timer reading cannot be converted to nanoseconds */
export { TimingClockError } from './TimingClockError.js';
