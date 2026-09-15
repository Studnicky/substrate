import type { BoundedDispatcherErrorEventEntity } from '../entities/BoundedDispatcherErrorEventEntity.js';

/** Lifecycle event published when dispatched work rejects. */
export interface BoundedDispatcherErrorEventInterface extends BoundedDispatcherErrorEventEntity.Type {
  readonly 'error': unknown;
}
