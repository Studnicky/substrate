import type { DrainStartedEventEntity } from '../entities/DrainStartedEventEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface DrainStartedEventInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'type': DrainStartedEventEntity.Type['type'];
}
