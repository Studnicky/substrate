import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { SemaphoreWaiterStateInterface } from './interfaces/SemaphoreWaiterStateInterface.js';
import type { SemaphoreWaiterTransitionEventInterface } from './interfaces/SemaphoreWaiterTransitionEventInterface.js';

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
 * `ready` and `cancelled` are terminal — a waiter object is discarded after
 * `Semaphore` observes either outcome, so no further transition is ever
 * requested for the same waiter, matching the original code's write-once
 * boolean fields.
 *
 * Stateless and shared: `Semaphore` keeps the actual per-waiter state on the
 * waiter object itself and calls `transition()` once per change, mirroring
 * `@studnicky/mutex`'s `MutexKeyMachine`.
 */
export class SemaphoreWaiterMachine extends StateMachine<SemaphoreWaiterStateInterface, SemaphoreWaiterTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): SemaphoreWaiterStateInterface {
    return { 'variant': 'queued' };
  }

  override reduce(
    state: SemaphoreWaiterStateInterface,
    event: SemaphoreWaiterTransitionEventInterface
  ): FsmStepInterface<SemaphoreWaiterStateInterface, never> {
    if (state.variant === 'queued' && event.type === 'markReady') {
      return { 'effects': [], 'state': { 'variant': 'ready' } };
    }
    if (state.variant === 'queued' && event.type === 'markCancelled') {
      return { 'effects': [], 'state': { 'variant': 'cancelled' } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal semaphore waiter edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }

  protected override isTerminated(state: SemaphoreWaiterStateInterface): boolean {
    return state.variant === 'ready' || state.variant === 'cancelled';
  }
}
