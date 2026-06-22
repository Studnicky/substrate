/**
 * Handle returned by `SchedulerProviderType.scheduleAt` and `scheduleEvery`.
 * Call `cancel()` to prevent future fires.
 *
 * @module
 */

/**
 * A cancellable task handle returned by a `SchedulerProviderType`.
 */
export type ScheduledTaskType = {
  /** Absolute epoch-ms at which this task was originally scheduled to fire. */
  readonly 'atMs': number;
  /** Cancels this task; no-ops if already fired or already cancelled. */
  readonly 'cancel': () => void;
  /** Unique opaque identifier for this task. */
  readonly 'id': string;
};
