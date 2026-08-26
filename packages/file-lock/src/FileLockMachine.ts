import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { FileLockAcquiredEventEntity } from './entities/FileLockAcquiredEventEntity.js';
import type { FileLockReleasedEventEntity } from './entities/FileLockReleasedEventEntity.js';
import type { FileLockStateEntity } from './entities/FileLockStateEntity.js';
import type { FileLockStateInterface } from './FileLockStateInterface.js';

/**
 * Pure lifecycle reducer for `FileLock`. Single source of truth for which
 * `from → to` edges are legal, replacing the single `#released` boolean that
 * used to guard `release()` directly.
 *
 * Legal edges:
 * - `acquiring → held` (the rename in `#acquire` succeeds)
 * - `held → released` (`release()` renames the lock path back)
 *
 * Stateless and shared: `FileLock` keeps the actual instance state in its own
 * field and calls `transition()` once per state change. This machine only
 * judges legality and computes the next state — it does not hold state of
 * its own, matching `@studnicky/fsm`'s reducer contract.
 */
export class FileLockMachine extends StateMachine<
  FileLockStateInterface,
  FileLockAcquiredEventEntity.Type | FileLockReleasedEventEntity.Type,
  never
> {
  constructor() {
    super();
  }

  override getInitialState(): FileLockStateInterface {
    return { 'variant': 'acquiring' };
  }

  override reduce(
    state: FileLockStateInterface,
    event: FileLockAcquiredEventEntity.Type | FileLockReleasedEventEntity.Type
  ): FsmStepInterface<FileLockStateInterface, never> {
    if (FileLockMachine.#isLegalEdge(state.variant, event)) {
      const toVariant: FileLockStateEntity.Type = event.type === 'acquired' ? 'held' : 'released';
      return { 'effects': [], 'state': { 'variant': toVariant } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal file-lock edge ${state.variant} → ${event.type}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(
    from: FileLockStateEntity.Type,
    event: FileLockAcquiredEventEntity.Type | FileLockReleasedEventEntity.Type
  ): boolean {
    if (from === 'acquiring' && event.type === 'acquired') { return true; }
    if (from === 'held' && event.type === 'released') { return true; }

    return false;
  }
}
