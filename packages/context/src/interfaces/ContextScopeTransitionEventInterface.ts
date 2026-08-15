import type { ContextScopeStateEntity } from '../entities/ContextScopeStateEntity.js';
import type { ContextScopeTransitionEventDiscriminantEntity } from '../entities/ContextScopeTransitionEventDiscriminantEntity.js';

/**
 * Requests a transition of the scope's lifecycle state to `to`. Mirrors the
 * target-state argument `ContextScope#transition(to)` has always taken — the
 * reducer decides whether `to` is reachable from the current state.
 */
export interface ContextScopeTransitionEventInterface extends ContextScopeTransitionEventDiscriminantEntity.Type {
  readonly 'to': ContextScopeStateEntity.Type;
  readonly 'type': ContextScopeTransitionEventDiscriminantEntity.Type['type'];
}
