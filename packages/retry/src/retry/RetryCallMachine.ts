import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { RetryCallStateEntity } from '../entities/RetryCallStateEntity.js';
import type { RetryCallStateInterface } from '../interfaces/RetryCallStateInterface.js';
import type { RetryCallTransitionEventInterface } from '../interfaces/RetryCallTransitionEventInterface.js';

/**
 * Pure lifecycle reducer for a single `Retry.execute()` call. Single source
 * of truth for which `from → to` edges are legal, replacing the hand-rolled
 * `if`-chain that used to live directly in `Retry#guardCall`.
 *
 * Legal edges:
 * - `attempting → succeeded`
 * - `attempting → waiting`
 * - `attempting → failed`
 * - `waiting   → attempting`
 * - `waiting   → exhausted`
 * - `waiting   → aborted`
 *
 * Stateless and shared: `Retry`'s per-call FSM keeps the actual state in its
 * own `#state` field and calls `transition()` once per state change, exactly
 * as it called the old hand-rolled `guardCall` once per change. This machine
 * only judges legality and computes the next state — it does not hold state
 * of its own, matching `@studnicky/fsm`'s reducer contract.
 */
export class RetryCallMachine extends StateMachine<RetryCallStateInterface, RetryCallTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): RetryCallStateInterface {
    return { 'variant': 'attempting' };
  }

  override reduce(
    state: RetryCallStateInterface,
    event: RetryCallTransitionEventInterface
  ): FsmStepInterface<RetryCallStateInterface, never> {
    if (RetryCallMachine.#isLegalEdge(state.variant, event.to)) {
      return { 'effects': [], 'state': { 'variant': event.to } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal state transition ${state.variant} → ${event.to}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(from: RetryCallStateEntity.Type, to: RetryCallStateEntity.Type): boolean {
    if (from === 'attempting' && to === 'succeeded') {return true;}
    if (from === 'attempting' && to === 'waiting') {return true;}
    if (from === 'attempting' && to === 'failed') {return true;}
    if (from === 'waiting' && to === 'attempting') {return true;}
    if (from === 'waiting' && to === 'exhausted') {return true;}
    if (from === 'waiting' && to === 'aborted') {return true;}

    return false;
  }
}
