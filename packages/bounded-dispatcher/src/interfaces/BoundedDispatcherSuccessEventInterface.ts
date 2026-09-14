import type { BoundedDispatcherSuccessEventEntity } from '../entities/BoundedDispatcherSuccessEventEntity.js';

/** Lifecycle event published when dispatched work resolves. */
export interface BoundedDispatcherSuccessEventInterface extends BoundedDispatcherSuccessEventEntity.Type {
  readonly 'result': unknown;
}
