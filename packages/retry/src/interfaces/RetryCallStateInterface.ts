import type { RetryCallStateEntity } from '../entities/RetryCallStateEntity.js';

/**
 * Wraps `RetryCallStateEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface RetryCallStateInterface {
  readonly 'variant': RetryCallStateEntity.Type;
}
