import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm/browser';

import type { ContextScopeStateEntity } from '../entities/ContextScopeStateEntity.js';
import type { ContextScopeTransitionEventEntity } from '../entities/ContextScopeTransitionEventEntity.js';
import type { ContextScopeVariantEntity } from '../entities/ContextScopeVariantEntity.js';

/** Pure lifecycle reducer for ContextScope. */
export class ContextScopeMachine extends StateMachine<ContextScopeStateEntity.Type, ContextScopeTransitionEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): ContextScopeStateEntity.Type {
    return { 'variant': 'created' };
  }

  override reduce(
    state: ContextScopeStateEntity.Type,
    event: ContextScopeTransitionEventEntity.Type
  ): FsmStepInterface<ContextScopeStateEntity.Type, never> {
    if (ContextScopeMachine.#isLegalEdge(state.variant, event.to)) {
      return { 'effects': [], 'state': { 'variant': event.to } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal state transition ${state.variant} → ${event.to}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(from: ContextScopeVariantEntity.Type, to: ContextScopeVariantEntity.Type): boolean {
    if (from === 'created' && to === 'active') {return true;}
    if (from === 'active' && to === 'terminated') {return true;}

    return false;
  }
}
