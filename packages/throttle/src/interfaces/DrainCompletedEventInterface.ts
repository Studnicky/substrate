import type { DrainCompletedEventEntity } from '../entities/DrainCompletedEventEntity.js';

/** `totalExecuted` is computed internally from live state; never externally validated. */
export interface DrainCompletedEventInterface {
  readonly 'totalExecuted': number;
  readonly 'type': DrainCompletedEventEntity.Type['type'];
}
