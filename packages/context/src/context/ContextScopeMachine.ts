import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { ContextScopeStateEntity } from '../entities/ContextScopeStateEntity.js';
import type { ContextScopeStateInterface } from '../interfaces/ContextScopeStateInterface.js';
import type { ContextScopeTransitionEventInterface } from '../interfaces/ContextScopeTransitionEventInterface.js';

/**
 * Pure lifecycle reducer for `ContextScope`. Single source of truth for
 * which `from → to` edges are legal, replacing the hand-rolled `if`-chain
 * that used to live directly in `ContextScope#guard`.
 *
 * Legal edges:
 * - `created → active` (initialization, at construction)
 * - `active → terminated` (via terminate())
 *
 * Stateless and shared: `ContextScope` keeps the actual state in its own
 * `#state` field and calls `transition()` once per state change, exactly as
 * it called the old hand-rolled `guard` once per change. This machine only
 * judges legality and computes the next state — it does not hold state of
 * its own, matching `@studnicky/fsm`'s reducer contract.
 */
export class ContextScopeMachine extends StateMachine<ContextScopeStateInterface, ContextScopeTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): ContextScopeStateInterface {
    return { 'variant': 'created' };
  }

  override reduce(
    state: ContextScopeStateInterface,
    event: ContextScopeTransitionEventInterface
  ): FsmStepInterface<ContextScopeStateInterface, never> {
    if (ContextScopeMachine.#isLegalEdge(state.variant, event.to)) {
      return { 'effects': [], 'state': { 'variant': event.to } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal state transition ${state.variant} → ${event.to}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(from: ContextScopeStateEntity.Type, to: ContextScopeStateEntity.Type): boolean {
    if (from === 'created' && to === 'active') {return true;}
    if (from === 'active' && to === 'terminated') {return true;}

    return false;
  }
}
