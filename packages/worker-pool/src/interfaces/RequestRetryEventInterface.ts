import type { RequestRetryEventEntity } from '../entities/RequestRetryEventEntity.js';

export interface RequestRetryEventInterface {
  readonly 'type': RequestRetryEventEntity.Type['type'];
}
