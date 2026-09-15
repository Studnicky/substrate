import type { SchedulerLogEntryEntity } from '../entities/SchedulerLogEntryEntity.js';
import type { SchedulerTaskDataEntity } from '../entities/SchedulerTaskDataEntity.js';

/** Runtime callback attached to serializable scheduler task data in the virtual heap. */
export interface PendingTaskInterface extends SchedulerTaskDataEntity.Type {
  readonly 'fire': () => Promise<void> | void;
  readonly 'id': SchedulerLogEntryEntity.Type['id'];
}
