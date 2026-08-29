/**
 * Per-operation lifecycle event/effect model, driven by `@studnicky/fsm`'s
 * `StateMachine`.
 *
 * `Throttle` already has a correct coarse mode FSM (`idle`/`active`/`draining`/`aborted`,
 * via `transition()`/`guard()`/`onEnter()`) — this machine does NOT replace or duplicate
 * that. Its job is narrower and different: it is the single point of truth for which
 * per-operation lifecycle hook fires for a given per-operation event (slot acquired,
 * contended, queued, window slid, operation rejected, adaptive adjustment, drain
 * started/completed, abort started, slot released).
 *
 * The machine has exactly one state variant — `'operational'` — because per-operation
 * events don't need named states of their own (the coarse FSM already owns "what mode is
 * the throttle in"). What matters here is `reduce()`'s contract: for EVERY event variant,
 * the switch returns an `effects` array containing EXACTLY ONE hook-firing effect. This is
 * what fixes the historical bug where `onRelease` fired twice for two of three release
 * outcomes (queue handoff, became idle) and zero times for the third (still busy, empty
 * queue) — depending on which of four scattered call sites happened to run. Because
 * `SlotReleased` has one switch arm covering all three outcomes and that arm always
 * returns a single `FireOnRelease` effect, no call path through this reducer can produce
 * zero or two fires: the correctness is structural, not the result of auditing every
 * caller by hand.
 *
 * `OperationLifecycleEffect`/`OperationLifecycleEvent`'s ten member interfaces are
 * referenced inline (via the namespace) at every use site — mirroring `CircuitBreakerMachine`
 * — rather than through a single named union alias, since a type alias over a union of
 * contract interfaces has no schema-derived remedy (`FireOnRejectEffectInterface` and
 * `OperationRejectedEventInterface` each carry a real `Error`, which is not
 * JSON-representable).
 *
 * @module
 */
import type { FsmStepInterface } from '@studnicky/fsm';

import { RuntimeError } from '@studnicky/errors';
import { StateMachine } from '@studnicky/fsm';

import type { OperationLifecycleEffect } from './OperationLifecycleEffect.js';
import type { OperationLifecycleEvent } from './OperationLifecycleEvent.js';

import { OperationLifecycleStateEntity } from '../entities/OperationLifecycleStateEntity.js';

interface OperationLifecycleEventReducerInterface {
  (
    state: OperationLifecycleStateEntity.Type,
    event: OperationLifecycleEvent.AbortStartedEventInterface
    | OperationLifecycleEvent.AcquiredEventInterface
    | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
    | OperationLifecycleEvent.ContendedEventInterface
    | OperationLifecycleEvent.DrainCompletedEventInterface
    | OperationLifecycleEvent.DrainStartedEventInterface
    | OperationLifecycleEvent.OperationRejectedEventInterface
    | OperationLifecycleEvent.QueuedEventInterface
    | OperationLifecycleEvent.SlotReleasedEventInterface
    | OperationLifecycleEvent.WindowSlidEventInterface
  ): FsmStepInterface<
    OperationLifecycleStateEntity.Type,
      OperationLifecycleEffect.FireOnAbortStartEffectInterface
      | OperationLifecycleEffect.FireOnAcquireEffectInterface
      | OperationLifecycleEffect.FireOnAcquireWaitEffectInterface
      | OperationLifecycleEffect.FireOnAdaptiveAdjustEffectInterface
      | OperationLifecycleEffect.FireOnContendedEffectInterface
      | OperationLifecycleEffect.FireOnDrainCompleteEffectInterface
      | OperationLifecycleEffect.FireOnDrainStartEffectInterface
      | OperationLifecycleEffect.FireOnReleaseEffectInterface
      | OperationLifecycleEffect.FireOnRejectEffectInterface
      | OperationLifecycleEffect.FireOnWindowSlideEffectInterface
  >;
}

export class OperationLifecycleMachine extends StateMachine<
  OperationLifecycleStateEntity.Type,
  OperationLifecycleEvent.AbortStartedEventInterface
  | OperationLifecycleEvent.AcquiredEventInterface
  | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
  | OperationLifecycleEvent.ContendedEventInterface
  | OperationLifecycleEvent.DrainCompletedEventInterface
  | OperationLifecycleEvent.DrainStartedEventInterface
  | OperationLifecycleEvent.OperationRejectedEventInterface
  | OperationLifecycleEvent.QueuedEventInterface
  | OperationLifecycleEvent.SlotReleasedEventInterface
  | OperationLifecycleEvent.WindowSlidEventInterface,
    OperationLifecycleEffect.FireOnAbortStartEffectInterface
    | OperationLifecycleEffect.FireOnAcquireEffectInterface
    | OperationLifecycleEffect.FireOnAcquireWaitEffectInterface
    | OperationLifecycleEffect.FireOnAdaptiveAdjustEffectInterface
    | OperationLifecycleEffect.FireOnContendedEffectInterface
    | OperationLifecycleEffect.FireOnDrainCompleteEffectInterface
    | OperationLifecycleEffect.FireOnDrainStartEffectInterface
    | OperationLifecycleEffect.FireOnReleaseEffectInterface
    | OperationLifecycleEffect.FireOnRejectEffectInterface
    | OperationLifecycleEffect.FireOnWindowSlideEffectInterface
> {
  private static readonly reducerByEventType = new Map<
    Parameters<OperationLifecycleEventReducerInterface>[1]['type'],
    OperationLifecycleEventReducerInterface
  >([
    ['AbortStarted', OperationLifecycleMachine.#reduceAbortStarted],
    ['Acquired', OperationLifecycleMachine.#reduceAcquired],
    ['ConcurrencyAdjusted', OperationLifecycleMachine.#reduceConcurrencyAdjusted],
    ['Contended', OperationLifecycleMachine.#reduceContended],
    ['DrainCompleted', OperationLifecycleMachine.#reduceDrainCompleted],
    ['DrainStarted', OperationLifecycleMachine.#reduceDrainStarted],
    ['OperationRejected', OperationLifecycleMachine.#reduceOperationRejected],
    ['Queued', OperationLifecycleMachine.#reduceQueued],
    ['SlotReleased', OperationLifecycleMachine.#reduceSlotReleased],
    ['WindowSlid', OperationLifecycleMachine.#reduceWindowSlid]
  ]);

  constructor() {
    super();
  }

  getInitialState(): OperationLifecycleStateEntity.Type {
    const initialState: OperationLifecycleStateEntity.Type = { 'variant': 'operational' };
    const result: OperationLifecycleStateEntity.Type = Object.assign({}, initialState);
    if (!OperationLifecycleStateEntity.validate(result)) {
      throw RuntimeError.create('OperationLifecycleMachine initial state is invalid');
    }
    return result;
  }

  reduce(
    state: OperationLifecycleStateEntity.Type,
    event: OperationLifecycleEvent.AbortStartedEventInterface
    | OperationLifecycleEvent.AcquiredEventInterface
    | OperationLifecycleEvent.ConcurrencyAdjustedEventInterface
    | OperationLifecycleEvent.ContendedEventInterface
    | OperationLifecycleEvent.DrainCompletedEventInterface
    | OperationLifecycleEvent.DrainStartedEventInterface
    | OperationLifecycleEvent.OperationRejectedEventInterface
    | OperationLifecycleEvent.QueuedEventInterface
    | OperationLifecycleEvent.SlotReleasedEventInterface
    | OperationLifecycleEvent.WindowSlidEventInterface
  ): ReturnType<OperationLifecycleEventReducerInterface> {
    const reducer = OperationLifecycleMachine.reducerByEventType.get(event.type);
    if (reducer === undefined) {
      throw RuntimeError.create(`Unhandled OperationLifecycleEvent: ${JSON.stringify(event)}`);
    }
    const result = reducer(state, event);
    return result;
  }

  static #reduceAbortStarted(
    state: OperationLifecycleStateEntity.Type,
    event: Parameters<OperationLifecycleEventReducerInterface>[1]
  ): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'AbortStarted') {
      throw RuntimeError.create(`Expected AbortStarted event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'cancelledCount': event.cancelledCount, 'variant': 'FireOnAbortStart' }], 'state': state };
    return result;
  }

  static #reduceAcquired(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'Acquired') {
      throw RuntimeError.create(`Expected Acquired event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnAcquire' }], 'state': state };
    return result;
  }

  static #reduceConcurrencyAdjusted(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'ConcurrencyAdjusted') {
      throw RuntimeError.create(`Expected ConcurrencyAdjusted event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'newLimit': event.newLimit, 'previousLimit': event.previousLimit, 'variant': 'FireOnAdaptiveAdjust' }], 'state': state };
    return result;
  }

  static #reduceContended(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'Contended') {
      throw RuntimeError.create(`Expected Contended event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnContended' }], 'state': state };
    return result;
  }

  static #reduceDrainCompleted(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'DrainCompleted') {
      throw RuntimeError.create(`Expected DrainCompleted event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'totalExecuted': event.totalExecuted, 'variant': 'FireOnDrainComplete' }], 'state': state };
    return result;
  }

  static #reduceDrainStarted(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'DrainStarted') {
      throw RuntimeError.create(`Expected DrainStarted event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnDrainStart' }], 'state': state };
    return result;
  }

  static #reduceOperationRejected(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'OperationRejected') {
      throw RuntimeError.create(`Expected OperationRejected event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'reason': event.reason, 'variant': 'FireOnReject' }], 'state': state };
    return result;
  }

  static #reduceQueued(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'Queued') {
      throw RuntimeError.create(`Expected Queued event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'queuedCount': event.queuedCount, 'variant': 'FireOnAcquireWait' }], 'state': state };
    return result;
  }

  static #reduceSlotReleased(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'SlotReleased') {
      throw RuntimeError.create(`Expected SlotReleased event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'activeCount': event.activeCount, 'totalExecuted': event.totalExecuted, 'variant': 'FireOnRelease' }], 'state': state };
    return result;
  }

  static #reduceWindowSlid(state: OperationLifecycleStateEntity.Type, event: Parameters<OperationLifecycleEventReducerInterface>[1]): ReturnType<OperationLifecycleEventReducerInterface> {
    if (event.type !== 'WindowSlid') {
      throw RuntimeError.create(`Expected WindowSlid event, received ${event.type}`);
    }
    const result: ReturnType<OperationLifecycleEventReducerInterface> = { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnWindowSlide' }], 'state': state };
    return result;
  }
}
