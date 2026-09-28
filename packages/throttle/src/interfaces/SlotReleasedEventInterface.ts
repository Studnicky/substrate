import type { SlotReleasedEventEntity } from '../entities/SlotReleasedEventEntity.js';

/** `activeCount`/`totalExecuted` are computed internally from live state; never externally validated. */
export interface SlotReleasedEventInterface {
  readonly 'activeCount': number;
  readonly 'outcome': SlotReleasedEventEntity.Type['outcome'];
  readonly 'totalExecuted': number;
  readonly 'type': SlotReleasedEventEntity.Type['type'];
}
