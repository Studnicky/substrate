import type { SchedulerLogEntryEntity } from '../entities/SchedulerLogEntryEntity.js';
import type { SchedulerTaskDataEntity } from '../entities/SchedulerTaskDataEntity.js';

/** Cancellable handle returned by a scheduler. */
export interface ScheduledTaskInterface {
  /** Absolute time at which the task is first scheduled to fire. */
  readonly 'atMs': SchedulerTaskDataEntity.Type['atMs'];
  /** Cancels the task. */
  cancel(): void;
  /** Unique opaque task identifier. */
  readonly 'id': SchedulerLogEntryEntity.Type['id'];
}
