import type { AbortStartedEventEntity } from '../entities/AbortStartedEventEntity.js';

/** `cancelledCount` is computed internally from live state; never externally validated. */
export interface AbortStartedEventInterface {
  readonly 'cancelledCount': number;
  readonly 'type': AbortStartedEventEntity.Type['type'];
}
