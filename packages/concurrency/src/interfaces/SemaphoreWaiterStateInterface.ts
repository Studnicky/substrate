import type { SemaphoreWaiterVariantEntity } from '../entities/SemaphoreWaiterVariantEntity.js';

/**
 * Wraps `SemaphoreWaiterVariantEntity.Type` in the `{ readonly variant }`
 * shape `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface SemaphoreWaiterStateInterface {
  readonly 'variant': SemaphoreWaiterVariantEntity.Type;
}
