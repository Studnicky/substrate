import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { CoalesceKeyStateInterface } from './interfaces/CoalesceKeyStateInterface.js';
import type { CoalesceKeyTransitionEventInterface } from './interfaces/CoalesceKeyTransitionEventInterface.js';

/**
 * Stateless per-key lifecycle reducer for `Coalesce`. Formalizes the
 * two-state lifecycle that was previously implicit in `#inFlight` map
 * membership (present => in flight, absent => idle) as an explicit FSM, for
 * consistency with every other lifecycle-bearing module in this monorepo —
 * not because the map-presence check was ever wrong.
 *
 * Legal edges:
 * - `idle -> inflight` (a new leader call starts the shared factory)
 * - `inflight -> idle` (the shared in-flight promise settles, success or failure)
 *
 * Stateless and shared: `Coalesce` keeps the actual per-key state in its own
 * `Map<string, CoalesceKeyStateInterface>` (a key absent from that map is
 * treated as `'idle'`, exactly as `MutexKeyMachine` treats an absent key as
 * `'unlocked'`) and calls `transition()` once per change.
 */
export class CoalesceKeyMachine extends StateMachine<CoalesceKeyStateInterface, CoalesceKeyTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): CoalesceKeyStateInterface {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: CoalesceKeyStateInterface,
    event: CoalesceKeyTransitionEventInterface
  ): FsmStepInterface<CoalesceKeyStateInterface, never> {
    if (state.variant === 'idle' && event.type === 'start') {
      return { 'effects': [], 'state': { 'variant': 'inflight' } };
    }
    if (state.variant === 'inflight' && event.type === 'settle') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal coalesce key edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }
}
