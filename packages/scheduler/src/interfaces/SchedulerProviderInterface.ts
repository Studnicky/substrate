import type { ScheduledTaskInterface } from './ScheduledTaskInterface.js';

/** Scheduling provider implemented by real-time and virtual schedulers. */
export interface SchedulerProviderInterface {
  /** Cancels all tasks registered with this provider. */
  cancelAll(): void;
  /** Schedules `fire` once at the absolute time `atMs`. */
  scheduleAt(atMs: number, fire: () => Promise<void> | void): ScheduledTaskInterface;
  /** Schedules `fire` repeatedly at `intervalMs`. */
  scheduleEvery(intervalMs: number, fire: () => Promise<void> | void): ScheduledTaskInterface;
}
