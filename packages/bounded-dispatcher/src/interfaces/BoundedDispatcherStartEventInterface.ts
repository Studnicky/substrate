import type { BoundedDispatcherStartEventEntity } from '../entities/BoundedDispatcherStartEventEntity.js';

/** Lifecycle event published immediately before dispatched work begins. */
export interface BoundedDispatcherStartEventInterface {
  readonly 'phase': BoundedDispatcherStartEventEntity.Type['phase'];
}
