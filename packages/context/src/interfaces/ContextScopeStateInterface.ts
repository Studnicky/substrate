import type { ContextScopeStateEntity } from '../entities/ContextScopeStateEntity.js';

/**
 * Wraps `ContextScopeStateEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface ContextScopeStateInterface {
  readonly 'variant': ContextScopeStateEntity.Type;
}
