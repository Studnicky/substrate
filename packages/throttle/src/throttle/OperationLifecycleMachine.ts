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
 * Every event/effect variant is a plain interface: their counter/id fields are computed
 * internally from live state and never externally validated, so none carry entity brands.
 *
 * @module
 */
import type { FsmStepInterface } from '@studnicky/fsm/browser';

import { RuntimeError } from '@studnicky/errors/browser';
import { StateMachine } from '@studnicky/fsm/browser';

import type { OperationLifecycleStateEntity } from '../entities/OperationLifecycleStateEntity.js';
import type { AbortStartedEventInterface } from '../interfaces/AbortStartedEventInterface.js';
import type { AcquiredEventInterface } from '../interfaces/AcquiredEventInterface.js';
import type { ConcurrencyAdjustedEventInterface } from '../interfaces/ConcurrencyAdjustedEventInterface.js';
import type { ContendedEventInterface } from '../interfaces/ContendedEventInterface.js';
import type { DrainCompletedEventInterface } from '../interfaces/DrainCompletedEventInterface.js';
import type { DrainStartedEventInterface } from '../interfaces/DrainStartedEventInterface.js';
import type { FireOnAbortStartEffectInterface } from '../interfaces/FireOnAbortStartEffectInterface.js';
import type { FireOnAcquireEffectInterface } from '../interfaces/FireOnAcquireEffectInterface.js';
import type { FireOnAcquireWaitEffectInterface } from '../interfaces/FireOnAcquireWaitEffectInterface.js';
import type { FireOnAdaptiveAdjustEffectInterface } from '../interfaces/FireOnAdaptiveAdjustEffectInterface.js';
import type { FireOnContendedEffectInterface } from '../interfaces/FireOnContendedEffectInterface.js';
import type { FireOnDrainCompleteEffectInterface } from '../interfaces/FireOnDrainCompleteEffectInterface.js';
import type { FireOnDrainStartEffectInterface } from '../interfaces/FireOnDrainStartEffectInterface.js';
import type { FireOnRejectEffectInterface } from '../interfaces/FireOnRejectEffectInterface.js';
import type { FireOnReleaseEffectInterface } from '../interfaces/FireOnReleaseEffectInterface.js';
import type { FireOnWindowSlideEffectInterface } from '../interfaces/FireOnWindowSlideEffectInterface.js';
import type { OperationRejectedEventInterface } from '../interfaces/OperationRejectedEventInterface.js';
import type { QueuedEventInterface } from '../interfaces/QueuedEventInterface.js';
import type { SlotReleasedEventInterface } from '../interfaces/SlotReleasedEventInterface.js';
import type { WindowSlidEventInterface } from '../interfaces/WindowSlidEventInterface.js';

interface OperationLifecycleEventReducerInterface {
  (
    state: OperationLifecycleStateEntity.Type,
    event: AbortStartedEventInterface
    | AcquiredEventInterface
    | ConcurrencyAdjustedEventInterface
    | ContendedEventInterface
    | DrainCompletedEventInterface
    | DrainStartedEventInterface
    | OperationRejectedEventInterface
    | QueuedEventInterface
    | SlotReleasedEventInterface
    | WindowSlidEventInterface
  ): FsmStepInterface<
    OperationLifecycleStateEntity.Type,
      FireOnAbortStartEffectInterface
      | FireOnAcquireEffectInterface
      | FireOnAcquireWaitEffectInterface
      | FireOnAdaptiveAdjustEffectInterface
      | FireOnContendedEffectInterface
      | FireOnDrainCompleteEffectInterface
      | FireOnDrainStartEffectInterface
      | FireOnReleaseEffectInterface
      | FireOnRejectEffectInterface
      | FireOnWindowSlideEffectInterface
  >;
}

export class OperationLifecycleMachine extends StateMachine<
  OperationLifecycleStateEntity.Type,
  AbortStartedEventInterface
  | AcquiredEventInterface
  | ConcurrencyAdjustedEventInterface
  | ContendedEventInterface
  | DrainCompletedEventInterface
  | DrainStartedEventInterface
  | OperationRejectedEventInterface
  | QueuedEventInterface
  | SlotReleasedEventInterface
  | WindowSlidEventInterface,
    FireOnAbortStartEffectInterface
    | FireOnAcquireEffectInterface
    | FireOnAcquireWaitEffectInterface
    | FireOnAdaptiveAdjustEffectInterface
    | FireOnContendedEffectInterface
    | FireOnDrainCompleteEffectInterface
    | FireOnDrainStartEffectInterface
    | FireOnReleaseEffectInterface
    | FireOnRejectEffectInterface
    | FireOnWindowSlideEffectInterface
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
    return { 'variant': 'operational' };
  }

  reduce(
    state: OperationLifecycleStateEntity.Type,
    event: AbortStartedEventInterface
    | AcquiredEventInterface
    | ConcurrencyAdjustedEventInterface
    | ContendedEventInterface
    | DrainCompletedEventInterface
    | DrainStartedEventInterface
    | OperationRejectedEventInterface
    | QueuedEventInterface
    | SlotReleasedEventInterface
    | WindowSlidEventInterface
  ): ReturnType<OperationLifecycleEventReducerInterface> {
    const reducer = OperationLifecycleMachine.reducerByEventType.get(event.type);
    if (reducer === undefined) {
      let description: string;
      try {
        description = JSON.stringify(event);
      } catch (cause) {
        throw RuntimeError.create(`Unhandled OperationLifecycleEvent: ${event.type}`, { 'cause': cause });
      }
      throw RuntimeError.create(`Unhandled OperationLifecycleEvent: ${description}`);
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
