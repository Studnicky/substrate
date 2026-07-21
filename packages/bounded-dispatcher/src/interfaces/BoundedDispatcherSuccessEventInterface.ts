import type { BoundedDispatcherSuccessEventEntity } from '../entities/BoundedDispatcherSuccessEventEntity.js';

/** Lifecycle event published when dispatched work resolves. */
export interface BoundedDispatcherSuccessEventInterface {
  readonly 'phase': BoundedDispatcherSuccessEventEntity.Type['phase'];
  readonly 'result': unknown;
}
