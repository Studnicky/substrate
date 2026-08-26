import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { CancellableTaskStateEntity } from '../entities/CancellableTaskStateEntity.js';
import type { CancellableTaskTransitionEventEntity } from '../entities/CancellableTaskTransitionEventEntity.js';
import type { CancellableTaskStateInterface } from '../interfaces/CancellableTaskStateInterface.js';

/**
 * Pure lifecycle reducer for `CancellableTask`. Single source of truth for
 * which `from → to` edges are legal, replacing the hand-rolled `#active`
 * boolean that used to live directly on `CancellableTask`.
 *
 * Legal edges:
 * - `pending → cancelled` (via `cancel()`; the only edge `cancel()` uses —
 *   calling `cancel()` again from `cancelled`/`completed` is rejected here
 *   and the caller treats the rejection as a silent no-op, matching the old
 *   `if (!#active) return` guard)
 * - `* → completed` (via `complete()`, which the original implementation
 *   applied unconditionally regardless of prior state — `pending`,
 *   `cancelled`, or already `completed` all transition to `completed`
 *   without error, preserving `complete()`'s old always-succeeds behavior)
 *
 * Stateless and shared: `CancellableTask` keeps the actual state in its own
 * `#state` field and calls `transition()` once per state change. This
 * machine only judges legality and computes the next state — it does not
 * hold state of its own, matching `@studnicky/fsm`'s reducer contract.
 */
export class CancellableTaskMachine extends StateMachine<CancellableTaskStateInterface, CancellableTaskTransitionEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): CancellableTaskStateInterface {
    return { 'variant': 'pending' };
  }

  override reduce(
    state: CancellableTaskStateInterface,
    event: CancellableTaskTransitionEventEntity.Type
  ): FsmStepInterface<CancellableTaskStateInterface, never> {
    if (CancellableTaskMachine.#isLegalEdge(state.variant, event.to)) {
      return { 'effects': [], 'state': { 'variant': event.to } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal state transition ${state.variant} → ${event.to}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(from: CancellableTaskStateEntity.Type, to: CancellableTaskStateEntity.Type): boolean {
    if (to === 'completed') {return true;}
    if (from === 'pending' && to === 'cancelled') {return true;}

    return false;
  }
}
