import type { FsmStepInterface } from '@studnicky/fsm/node';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm/node';

import type { SemaphoreGrantStateEntity } from './entities/SemaphoreGrantStateEntity.js';
import type { SemaphoreGrantTransitionEventEntity } from './entities/SemaphoreGrantTransitionEventEntity.js';

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
export class SemaphoreGrantMachine extends StateMachine<SemaphoreGrantStateEntity.Type, SemaphoreGrantTransitionEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): SemaphoreGrantStateEntity.Type {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: SemaphoreGrantStateEntity.Type,
    event: SemaphoreGrantTransitionEventEntity.Type
  ): FsmStepInterface<SemaphoreGrantStateEntity.Type, never> {
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
