import type { SchedulerLogEntryEntity } from '../entities/SchedulerLogEntryEntity.js';
import type { SchedulerTaskDataEntity } from '../entities/SchedulerTaskDataEntity.js';

/** Internal scheduled work retained by the virtual scheduler heap. */
export interface PendingTaskInterface {
  readonly 'atMs': SchedulerTaskDataEntity.Type['atMs'];
  readonly 'fire': () => Promise<void> | void;
  readonly 'id': SchedulerLogEntryEntity.Type['id'];
  readonly 'intervalMs': SchedulerTaskDataEntity.Type['intervalMs'];
  readonly 'variant': SchedulerTaskDataEntity.Type['variant'];
}
