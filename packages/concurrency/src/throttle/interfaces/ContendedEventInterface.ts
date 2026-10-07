import type { ContendedEventEntity } from '../entities/ContendedEventEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface ContendedEventInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'type': ContendedEventEntity.Type['type'];
}
