import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { MutexKeyStateEntity } from '../entities/MutexKeyStateEntity.js';
import type { MutexKeyStateInterface } from '../interfaces/MutexKeyStateInterface.js';
import type { MutexKeyTransitionEventInterface } from '../interfaces/MutexKeyTransitionEventInterface.js';

/**
 * Pure per-key lifecycle reducer for `Mutex`. Single source of truth for
 * which `from → to` edges are legal, replacing the hand-rolled `if`-chain
 * that used to live directly in `Mutex#guardKey`.
 *
 * Legal edges:
 * - `unlocked → locked` (immediate acquisition, or the sole/next queued
 *   waiter taking over an uncontested key)
 * - `locked → queued` (a waiter queues behind the current holder)
 * - `queued → locked` (the next queued waiter takes the lock)
 * - `locked → unlocked` (the holder releases with nobody waiting)
 *
 * Stateless and shared: `Mutex` keeps the actual per-key state in its own
 * `Map<K, MutexKeyStateEntity.Type>` (a key absent from that map is treated
 * as `'unlocked'`) and calls `transition()` once per state change, exactly
 * as it called the old hand-rolled `guardKey` once per change. This machine
 * only judges legality and computes the next state — it does not hold state
 * of its own, matching `@studnicky/fsm`'s reducer contract.
 */
export class MutexKeyMachine extends StateMachine<MutexKeyStateInterface, MutexKeyTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): MutexKeyStateInterface {
    return { 'variant': 'unlocked' };
  }

  override reduce(
    state: MutexKeyStateInterface,
    event: MutexKeyTransitionEventInterface
  ): FsmStepInterface<MutexKeyStateInterface, never> {
    if (MutexKeyMachine.#isLegalEdge(state.variant, event.to)) {
      return { 'effects': [], 'state': { 'variant': event.to } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal per-key edge ${state.variant} → ${event.to}`,
      'stateVariant': state.variant
    });
  }

  static #isLegalEdge(from: MutexKeyStateEntity.Type, to: MutexKeyStateEntity.Type): boolean {
    if (from === 'unlocked' && to === 'locked') {return true;}
    if (from === 'locked' && to === 'queued') {return true;}
    if (from === 'queued' && to === 'locked') {return true;}
    if (from === 'locked' && to === 'unlocked') {return true;}

    return false;
  }
}
