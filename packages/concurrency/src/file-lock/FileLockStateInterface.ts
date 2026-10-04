import type { FileLockStateEntity } from './entities/FileLockStateEntity.js';

/**
 * Wraps `FileLockStateEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface FileLockStateInterface {
  readonly 'variant': FileLockStateEntity.Type;
}
