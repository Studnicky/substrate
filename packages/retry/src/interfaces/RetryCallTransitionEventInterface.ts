import type { RetryCallStateEntity } from '../entities/RetryCallStateEntity.js';
import type { RetryCallTransitionEventDiscriminantEntity } from '../entities/RetryCallTransitionEventDiscriminantEntity.js';

/**
 * Requests a transition of the per-call lifecycle state to `to`. Mirrors the
 * target-state argument `Retry#guardCall(from, to)` has always taken — the
 * reducer decides whether `to` is reachable from the current state.
 */
export interface RetryCallTransitionEventInterface extends RetryCallTransitionEventDiscriminantEntity.Type {
  readonly 'to': RetryCallStateEntity.Type;
  readonly 'type': RetryCallTransitionEventDiscriminantEntity.Type['type'];
}
