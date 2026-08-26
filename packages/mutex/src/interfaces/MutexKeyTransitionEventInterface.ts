import type { MutexKeyStateEntity } from '../entities/MutexKeyStateEntity.js';
import type { MutexKeyTransitionEventDiscriminantEntity } from '../entities/MutexKeyTransitionEventDiscriminantEntity.js';

/**
 * Requests a transition of a single key's lifecycle state to `to`. Mirrors
 * the target-state argument `Mutex#transitionKey(key, to)` has always taken —
 * the reducer decides whether `to` is reachable from the current state.
 */
export interface MutexKeyTransitionEventInterface extends MutexKeyTransitionEventDiscriminantEntity.Type {
  readonly 'to': MutexKeyStateEntity.Type;
  readonly 'type': MutexKeyTransitionEventDiscriminantEntity.Type['type'];
}
