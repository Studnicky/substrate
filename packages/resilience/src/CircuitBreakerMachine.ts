/**
 * Internal reducer for `CircuitBreaker`. Pure state transitions with no
 * side effects — `closed` → `open` (failure threshold breached) → `halfOpen`
 * (after `resetTimeoutMs`) → `closed` (trial success) or → `open` (trial
 * failure). Not exported from the package barrel; consumers only ever see
 * `CircuitBreaker`.
 *
 * This is the single source of truth for which lifecycle hooks fire on a
 * given transition, and in what order — `reduce()` returns them as an
 * ordered `effects` list rather than leaving `CircuitBreaker` to decide
 * which hooks to invoke. That is what makes double-firing or missed-firing
 * hooks structurally impossible: there is exactly one place that decides,
 * and `CircuitBreaker` merely plays back whatever that place decided.
 *
 * `failureThreshold`/`successThreshold` are fixed at construction and read
 * as closures inside `reduce()` — `reduce()` itself has no side effects, but
 * it is not a free function; it is scoped to the machine instance the same
 * way `PaginatorMachine`'s reducer is.
 *
 * Time (`Date.now()`/injected clock) is intentionally kept OUT of this
 * reducer. `resetTimeoutElapsed`/`callFailed`/`manualOpen` events carry the
 * relevant timestamp as event data, computed by `CircuitBreaker` itself —
 * exactly the way `PaginatorMachine`'s `pageReceived` event carries an
 * externally-fetched cursor rather than the machine reaching out for it.
 */

import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { CircuitBreakerCallRejectedEventEntity } from './entities/CircuitBreakerCallRejectedEventEntity.js';
import type { CircuitBreakerCallSucceededEventEntity } from './entities/CircuitBreakerCallSucceededEventEntity.js';
import type { CircuitBreakerClosedStateEntity } from './entities/CircuitBreakerClosedStateEntity.js';
import type { CircuitBreakerHalfOpenStateEntity } from './entities/CircuitBreakerHalfOpenStateEntity.js';
import type { CircuitBreakerMachineOptionsEntity } from './entities/CircuitBreakerMachineOptionsEntity.js';
import type { CircuitBreakerManualOpenEventEntity } from './entities/CircuitBreakerManualOpenEventEntity.js';
import type { CircuitBreakerManualResetEventEntity } from './entities/CircuitBreakerManualResetEventEntity.js';
import type { CircuitBreakerOnCloseEffectEntity } from './entities/CircuitBreakerOnCloseEffectEntity.js';
import type { CircuitBreakerOnHalfOpenEffectEntity } from './entities/CircuitBreakerOnHalfOpenEffectEntity.js';
import type { CircuitBreakerOnOpenEffectEntity } from './entities/CircuitBreakerOnOpenEffectEntity.js';
import type { CircuitBreakerOnRejectEffectEntity } from './entities/CircuitBreakerOnRejectEffectEntity.js';
import type { CircuitBreakerOnSuccessEffectEntity } from './entities/CircuitBreakerOnSuccessEffectEntity.js';
import type { CircuitBreakerOnTripEffectEntity } from './entities/CircuitBreakerOnTripEffectEntity.js';
import type { CircuitBreakerOpenStateEntity } from './entities/CircuitBreakerOpenStateEntity.js';
import type { CircuitBreakerResetTimeoutElapsedEventEntity } from './entities/CircuitBreakerResetTimeoutElapsedEventEntity.js';
import type { CircuitBreakerCallFailedEventInterface } from './interfaces/CircuitBreakerCallFailedEventInterface.js';
import type { CircuitBreakerOnFailureEffectInterface } from './interfaces/CircuitBreakerOnFailureEffectInterface.js';

export class CircuitBreakerMachine extends StateMachine<
  CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
  CircuitBreakerCallFailedEventInterface
  | CircuitBreakerCallRejectedEventEntity.Type
  | CircuitBreakerCallSucceededEventEntity.Type
  | CircuitBreakerManualOpenEventEntity.Type
  | CircuitBreakerManualResetEventEntity.Type
  | CircuitBreakerResetTimeoutElapsedEventEntity.Type,
    CircuitBreakerOnCloseEffectEntity.Type
    | CircuitBreakerOnFailureEffectInterface
    | CircuitBreakerOnHalfOpenEffectEntity.Type
    | CircuitBreakerOnOpenEffectEntity.Type
    | CircuitBreakerOnRejectEffectEntity.Type
    | CircuitBreakerOnSuccessEffectEntity.Type
    | CircuitBreakerOnTripEffectEntity.Type
> {
  readonly #failureThreshold: number;
  readonly #successThreshold: number;

  constructor(options: CircuitBreakerMachineOptionsEntity.Type) {
    super();
    this.#failureThreshold = options.failureThreshold;
    this.#successThreshold = options.successThreshold;
  }

  override getInitialState(): CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type {
    return { 'failureCount': 0, 'variant': 'closed' };
  }

  override reduce(
    state: CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
    event: CircuitBreakerCallFailedEventInterface
    | CircuitBreakerCallRejectedEventEntity.Type
    | CircuitBreakerCallSucceededEventEntity.Type
    | CircuitBreakerManualOpenEventEntity.Type
    | CircuitBreakerManualResetEventEntity.Type
    | CircuitBreakerResetTimeoutElapsedEventEntity.Type
  ): FsmStepInterface<
    CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
      CircuitBreakerOnCloseEffectEntity.Type
      | CircuitBreakerOnFailureEffectInterface
      | CircuitBreakerOnHalfOpenEffectEntity.Type
      | CircuitBreakerOnOpenEffectEntity.Type
      | CircuitBreakerOnRejectEffectEntity.Type
      | CircuitBreakerOnSuccessEffectEntity.Type
      | CircuitBreakerOnTripEffectEntity.Type
  > {
    const transitionHandlers = new Map<typeof event.type, () => ReturnType<CircuitBreakerMachine['reduce']>>([
      ['callFailed', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        if (event.type !== 'callFailed') {
          throw new TransitionRejectedError({ 'eventType': event.type, 'reason': 'Unexpected CircuitBreakerMachine event type', 'stateVariant': state.variant });
        }
        const result = this.#reduceCallFailed(state, event);
        return result;
      }],
      ['callRejected', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        const result: ReturnType<CircuitBreakerMachine['reduce']> = { 'effects': [{ 'variant': 'onReject' }], 'state': state };
        return result;
      }],
      ['callSucceeded', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        const result = this.#reduceCallSucceeded(state);
        return result;
      }],
      ['manualOpen', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        if (event.type !== 'manualOpen') {
          throw new TransitionRejectedError({ 'eventType': event.type, 'reason': 'Unexpected CircuitBreakerMachine event type', 'stateVariant': state.variant });
        }
        const result: ReturnType<CircuitBreakerMachine['reduce']> = { 'effects': [{ 'variant': 'onOpen' }], 'state': { 'openedAt': event.at, 'variant': 'open' } };
        return result;
      }],
      ['manualReset', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        const result: ReturnType<CircuitBreakerMachine['reduce']> = { 'effects': [{ 'variant': 'onClose' }], 'state': { 'failureCount': 0, 'variant': 'closed' } };
        return result;
      }],
      ['resetTimeoutElapsed', (): ReturnType<CircuitBreakerMachine['reduce']> => {
        const result = this.#reduceResetTimeoutElapsed(state);
        return result;
      }]
    ]);
    const handler = transitionHandlers.get(event.type);
    if (handler === undefined) {
      throw new TransitionRejectedError({ 'eventType': event.type, 'reason': 'Unhandled CircuitBreakerMachine event type', 'stateVariant': state.variant });
    }
    const result = handler();
    return result;
  }

  #reduceResetTimeoutElapsed(
    state: CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type
  ): FsmStepInterface<
    CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
      CircuitBreakerOnCloseEffectEntity.Type
      | CircuitBreakerOnFailureEffectInterface
      | CircuitBreakerOnHalfOpenEffectEntity.Type
      | CircuitBreakerOnOpenEffectEntity.Type
      | CircuitBreakerOnRejectEffectEntity.Type
      | CircuitBreakerOnSuccessEffectEntity.Type
      | CircuitBreakerOnTripEffectEntity.Type
  > {
    if (state.variant !== 'open') {
      throw new TransitionRejectedError({
        'eventType': 'resetTimeoutElapsed',
        'reason': `resetTimeoutElapsed is only valid from 'open', not '${state.variant}'`,
        'stateVariant': state.variant
      });
    }
    return { 'effects': [{ 'variant': 'onHalfOpen' }], 'state': { 'successCount': 0, 'variant': 'halfOpen' } };
  }

  #reduceCallSucceeded(
    state: CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type
  ): FsmStepInterface<
    CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
      CircuitBreakerOnCloseEffectEntity.Type
      | CircuitBreakerOnFailureEffectInterface
      | CircuitBreakerOnHalfOpenEffectEntity.Type
      | CircuitBreakerOnOpenEffectEntity.Type
      | CircuitBreakerOnRejectEffectEntity.Type
      | CircuitBreakerOnSuccessEffectEntity.Type
      | CircuitBreakerOnTripEffectEntity.Type
  > {
    if (state.variant === 'open') {
      throw new TransitionRejectedError({
        'eventType': 'callSucceeded',
        'reason': "callSucceeded is not valid while 'open' — execute() must reject the call before the wrapped function ever runs",
        'stateVariant': state.variant
      });
    }
    if (state.variant === 'halfOpen') {
      const successCount = state.successCount + 1;
      if (successCount >= this.#successThreshold) {
        return {
          'effects': [{ 'variant': 'onSuccess' }, { 'variant': 'onClose' }],
          'state': { 'failureCount': 0, 'variant': 'closed' }
        };
      }
      return { 'effects': [{ 'variant': 'onSuccess' }], 'state': { 'successCount': successCount, 'variant': 'halfOpen' } };
    }
    return { 'effects': [{ 'variant': 'onSuccess' }], 'state': { 'failureCount': 0, 'variant': 'closed' } };
  }

  #reduceCallFailed(
    state: CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
    event: CircuitBreakerCallFailedEventInterface
  ): FsmStepInterface<
    CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type,
      CircuitBreakerOnCloseEffectEntity.Type
      | CircuitBreakerOnFailureEffectInterface
      | CircuitBreakerOnHalfOpenEffectEntity.Type
      | CircuitBreakerOnOpenEffectEntity.Type
      | CircuitBreakerOnRejectEffectEntity.Type
      | CircuitBreakerOnSuccessEffectEntity.Type
      | CircuitBreakerOnTripEffectEntity.Type
  > {
    if (state.variant === 'open') {
      throw new TransitionRejectedError({
        'eventType': 'callFailed',
        'reason': "callFailed is not valid while 'open' — execute() must reject the call before the wrapped function ever runs",
        'stateVariant': state.variant
      });
    }
    if (state.variant === 'halfOpen') {
      // halfOpen → open re-open path: onOpen fires, onTrip does NOT — a trial
      // failure re-opening the circuit is not the same event as the circuit
      // tripping from closed.
      return {
        'effects': [{ 'error': event.error, 'variant': 'onFailure' }, { 'variant': 'onOpen' }],
        'state': { 'openedAt': event.at, 'variant': 'open' }
      };
    }
    const failureCount = state.failureCount + 1;
    if (failureCount >= this.#failureThreshold) {
      // closed → open path: both onTrip and onOpen fire, onTrip first.
      return {
        'effects': [{ 'error': event.error, 'variant': 'onFailure' }, { 'variant': 'onTrip' }, { 'variant': 'onOpen' }],
        'state': { 'openedAt': event.at, 'variant': 'open' }
      };
    }
    return { 'effects': [{ 'error': event.error, 'variant': 'onFailure' }], 'state': { 'failureCount': failureCount, 'variant': 'closed' } };
  }
}
