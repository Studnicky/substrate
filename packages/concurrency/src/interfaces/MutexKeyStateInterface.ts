import type { MutexKeyStateEntity } from '../entities/MutexKeyStateEntity.js';

/**
 * Wraps `MutexKeyStateEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface MutexKeyStateInterface {
  readonly 'variant': MutexKeyStateEntity.Type;
}
