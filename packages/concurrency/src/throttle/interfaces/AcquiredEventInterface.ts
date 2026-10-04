import type { AcquiredEventEntity } from '../entities/AcquiredEventEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface AcquiredEventInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'type': AcquiredEventEntity.Type['type'];
}
