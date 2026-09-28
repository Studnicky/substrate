import type { SchedulerLogEntryEntity } from '../entities/SchedulerLogEntryEntity.js';
import type { SchedulerTaskDataEntity } from '../entities/SchedulerTaskDataEntity.js';

/** `atMs`/`intervalMs` are computed internally for the virtual heap; never externally validated. `variant` is a stable enum, kept on the entity. */
export interface PendingTaskInterface {
  readonly 'atMs': number;
  readonly 'fire': () => Promise<void> | void;
  readonly 'id': SchedulerLogEntryEntity.Type['id'];
  readonly 'intervalMs': number;
  readonly 'variant': SchedulerTaskDataEntity.Type['variant'];
}
