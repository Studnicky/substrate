import type { QueuedEventEntity } from '../entities/QueuedEventEntity.js';

/** `queuedCount` is computed internally from live state; never externally validated. */
export interface QueuedEventInterface {
  readonly 'queuedCount': number;
  readonly 'type': QueuedEventEntity.Type['type'];
}
