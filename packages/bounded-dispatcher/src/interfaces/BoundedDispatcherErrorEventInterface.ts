import type { BoundedDispatcherErrorEventEntity } from '../entities/BoundedDispatcherErrorEventEntity.js';

/** Lifecycle event published when dispatched work rejects. */
export interface BoundedDispatcherErrorEventInterface {
  readonly 'error': unknown;
  readonly 'phase': BoundedDispatcherErrorEventEntity.Type['phase'];
}
