import type { SemaphoreGrantVariantEntity } from '../entities/SemaphoreGrantVariantEntity.js';

/**
 * Wraps `SemaphoreGrantVariantEntity.Type` in the `{ readonly variant }`
 * shape `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface SemaphoreGrantStateInterface {
  readonly 'variant': SemaphoreGrantVariantEntity.Type;
}
