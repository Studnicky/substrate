import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { ChannelKeyVariantEntity } from './entities/ChannelKeyVariantEntity.js';
import type { ChannelKeyStateInterface } from './interfaces/ChannelKeyStateInterface.js';
import type { ChannelKeyTransitionEventInterface } from './interfaces/ChannelKeyTransitionEventInterface.js';

/**
 * Stateless per-key lifecycle reducer for `Channel`. Single source of truth
 * for which `from -> to` edges are legal across the product of the `closed`
 * and `subscriber` flags a key independently carries — a key can be
 * `closed` while its subscriber is still draining a buffered backlog, so
 * `closed-subscribed` is a real, reachable state rather than an invariant
 * violation.
 *
 * Legal edges:
 * - `subscribe`: `open-idle -> open-subscribed`, `closed-idle -> closed-subscribed`
 *   (subscribing to a key created after the channel already closed)
 * - `unsubscribe`: `open-subscribed -> open-idle`, `closed-subscribed -> closed-idle`
 * - `close`: `open-idle -> closed-idle`, `open-subscribed -> closed-subscribed`,
 *   and a same-variant self-loop from either closed state — `Channel#close()`
 *   marks every tracked key closed unconditionally, so closing an
 *   already-closed key must stay legal and idempotent rather than reject.
 *
 * Stateless and shared: `Channel` keeps the actual per-key state on its own
 * per-key entry and calls `transition()` once per change, mirroring
 * `@studnicky/mutex`'s `MutexKeyMachine`.
 */
export class ChannelKeyMachine extends StateMachine<ChannelKeyStateInterface, ChannelKeyTransitionEventInterface, never> {
  constructor() {
    super();
  }

  override getInitialState(): ChannelKeyStateInterface {
    return { 'variant': 'open-idle' };
  }

  override reduce(
    state: ChannelKeyStateInterface,
    event: ChannelKeyTransitionEventInterface
  ): FsmStepInterface<ChannelKeyStateInterface, never> {
    const next = ChannelKeyMachine.#nextVariant(state.variant, event.type);
    if (next !== undefined) {
      return { 'effects': [], 'state': { 'variant': next } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal channel key edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }

  static #nextVariant(
    from: ChannelKeyVariantEntity.Type,
    type: ChannelKeyTransitionEventInterface['type']
  ): ChannelKeyVariantEntity.Type | undefined {
    if (type === 'subscribe') {
      if (from === 'open-idle') {return 'open-subscribed';}
      if (from === 'closed-idle') {return 'closed-subscribed';}
      return undefined;
    }
    if (type === 'unsubscribe') {
      if (from === 'open-subscribed') {return 'open-idle';}
      if (from === 'closed-subscribed') {return 'closed-idle';}
      return undefined;
    }
    // type === 'close'
    if (from === 'open-idle') {return 'closed-idle';}
    if (from === 'open-subscribed') {return 'closed-subscribed';}
    return from; // closed-idle / closed-subscribed: idempotent self-loop
  }
}
