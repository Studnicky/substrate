import type { WindowSlidEventEntity } from '../entities/WindowSlidEventEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface WindowSlidEventInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'type': WindowSlidEventEntity.Type['type'];
}
