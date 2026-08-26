import type { CancellableTaskStateEntity } from '../entities/CancellableTaskStateEntity.js';

/**
 * Wraps `CancellableTaskStateEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface CancellableTaskStateInterface {
  readonly 'variant': CancellableTaskStateEntity.Type;
}
