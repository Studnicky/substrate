import type { DeadlineTimerHandleInterface } from './DeadlineTimerHandleInterface.js';

/**
 * Minimal timer port used by `RaceTimeout` and `Signal.compose()`'s deadline.
 * Implement to inject deterministic timing in tests instead of racing real timers.
 */
export interface DeadlineTimerInterface {
  /** Current time in epoch milliseconds. */
  now(): number;
  /** Schedules `fire` to run at `atMs`. Returns a handle whose `cancel()` clears it before it fires. */
  scheduleAt(atMs: number, fire: () => void): DeadlineTimerHandleInterface;
}
