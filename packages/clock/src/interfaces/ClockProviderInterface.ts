/**
 * Supplies wall-clock and monotonic time to the `Clock` class.
 * Implement this interface to inject deterministic time in tests.
 */
export interface ClockProviderInterface {
  /** Returns a monotonic timestamp in nanoseconds. */
  hrtime(): bigint;
  /** Returns the current time in milliseconds since the Unix epoch. */
  now(): number;
}
