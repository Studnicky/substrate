import type { FsmStepInterface } from '@studnicky/fsm/node';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm/node';

import type { SemaphoreWaiterStateEntity } from './entities/SemaphoreWaiterStateEntity.js';
import type { SemaphoreWaiterTransitionEventEntity } from './entities/SemaphoreWaiterTransitionEventEntity.js';

/**
 * Stateless per-waiter lifecycle reducer for `Semaphore`. Single source of
 * truth for which `from -> to` edges are legal, replacing the two
 * independently-written booleans (`cancelled`, `ready`) that used to live
 * directly on the waiter object.
 *
 * Legal edges:
 * - `queued -> ready` (the waiter's `onAcquireWait`/`onContended` hooks
 *   resolved; it is now eligible for delegation)
 * - `queued -> cancelled` (one of those hooks rejected; the acquisition is
 *   abandoned)
 *
 * `ready -> cancelled` allows a caller to withdraw while waiting for a
 * permit. `cancelled` is terminal; granted waiters leave the queue.
 *
 * Stateless and shared: `Semaphore` keeps the actual per-waiter state on the
 * waiter object itself and calls `transition()` once per change, mirroring
 * `@studnicky/mutex`'s `MutexKeyMachine`.
 */
export class SemaphoreWaiterMachine extends StateMachine<SemaphoreWaiterStateEntity.Type, SemaphoreWaiterTransitionEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): SemaphoreWaiterStateEntity.Type {
    return { 'variant': 'queued' };
  }

  override reduce(
    state: SemaphoreWaiterStateEntity.Type,
    event: SemaphoreWaiterTransitionEventEntity.Type
  ): FsmStepInterface<SemaphoreWaiterStateEntity.Type, never> {
    if (state.variant === 'queued' && event.type === 'markReady') {
      return { 'effects': [], 'state': { 'variant': 'ready' } };
    }
    if (state.variant === 'queued' && event.type === 'markCancelled') {
      return { 'effects': [], 'state': { 'variant': 'cancelled' } };
    }
    if (state.variant === 'ready' && event.type === 'markCancelled') {
      return { 'effects': [], 'state': { 'variant': 'cancelled' } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal semaphore waiter edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }

  protected override isTerminated(state: SemaphoreWaiterStateEntity.Type): boolean {
    const result = state.variant === 'cancelled';
    return result;
  }
}
