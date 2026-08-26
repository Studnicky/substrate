import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { SemaphoreGrantStateInterface } from './interfaces/SemaphoreGrantStateInterface.js';
import type { SemaphoreGrantTransitionEventInterface } from './interfaces/SemaphoreGrantTransitionEventInterface.js';

/**
 * Stateless reducer for the single reentrancy guard `Semaphore#grantReadyWaiters`
 * uses to stop a hook callback from re-entering the grant loop. Replaces the
 * bare `#granting` boolean with an explicit two-state machine, for
 * consistency with every other lifecycle-bearing module in this monorepo —
 * not because the boolean guard was ever wrong.
 *
 * Legal edges:
 * - `idle -> granting` (the grant loop is entered)
 * - `granting -> idle` (the grant loop exits, in a `finally`)
 *
 * `Semaphore` still performs its own `if (variant === 'granting') return;`
 * short-circuit before requesting `start` — exactly as the original code
 * checked `if (this.#granting) return 0;` before setting the flag — so
 * `start` is never requested while already `granting` and this reducer never
 * has to reject a call in practice.
 */
export class SemaphoreGrantMachine extends StateMachine<SemaphoreGrantStateInterface, SemaphoreGrantTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): SemaphoreGrantStateInterface {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: SemaphoreGrantStateInterface,
    event: SemaphoreGrantTransitionEventInterface
  ): FsmStepInterface<SemaphoreGrantStateInterface, never> {
    if (state.variant === 'idle' && event.type === 'start') {
      return { 'effects': [], 'state': { 'variant': 'granting' } };
    }
    if (state.variant === 'granting' && event.type === 'finish') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal semaphore grant edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }
}
