import type { FsmStepInterface } from '@studnicky/fsm/node';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm/node';

import type { RetryCallStateEntity } from '../entities/RetryCallStateEntity.js';
import type { RetryCallTransitionEventEntity } from '../entities/RetryCallTransitionEventEntity.js';

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
export class RetryCallMachine extends StateMachine<RetryCallStateEntity.Type, RetryCallTransitionEventEntity.Type, never> {
  static readonly #allowedTargetsBySource = new Map<string, Set<string>>([
    ['attempting', new Set(['failed', 'succeeded', 'waiting'])],
    ['waiting', new Set(['aborted', 'attempting', 'exhausted'])]
  ]);

  static readonly #statesByVariant = new Map<string, RetryCallStateEntity.Type>([
    ['aborted', { 'variant': 'aborted' }],
    ['attempting', { 'variant': 'attempting' }],
    ['exhausted', { 'variant': 'exhausted' }],
    ['failed', { 'variant': 'failed' }],
    ['succeeded', { 'variant': 'succeeded' }],
    ['waiting', { 'variant': 'waiting' }]
  ]);

  static #isLegalEdge(from: RetryCallStateEntity.Type, to: RetryCallTransitionEventEntity.Type): boolean {
    const allowedTargets = RetryCallMachine.#allowedTargetsBySource.get(from.variant);
    const result = allowedTargets?.has(to.to) ?? false;
    return result;
  }

  static #stateFor(event: RetryCallTransitionEventEntity.Type): RetryCallStateEntity.Type {
    const state = RetryCallMachine.#statesByVariant.get(event.to);
    if (state === undefined) {
      throw new TransitionRejectedError({
        'eventType': String(event.type),
        'reason': 'transition event targets an unknown retry state',
        'stateVariant': 'unknown'
      });
    }
    return { ...state };
  }


  constructor() {
    super();
  }

  override getInitialState(): RetryCallStateEntity.Type {
    return { 'variant': 'attempting' };
  }

  override reduce(
    state: RetryCallStateEntity.Type,
    event: RetryCallTransitionEventEntity.Type
  ): FsmStepInterface<RetryCallStateEntity.Type, never> {
    if (RetryCallMachine.#isLegalEdge(state, event)) {
      return { 'effects': [], 'state': RetryCallMachine.#stateFor(event) };
    }

    throw new TransitionRejectedError({
      'eventType': String(event.type),
      'reason': `illegal state transition ${state.variant} → ${event.to}`,
      'stateVariant': String(state.variant)
    });
  }

}
