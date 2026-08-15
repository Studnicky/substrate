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

import { StateMachine } from '@studnicky/fsm';

import type { OperationLifecycleStateEntity } from '../entities/OperationLifecycleStateEntity.js';
import type { OperationLifecycleEffect } from './OperationLifecycleEffect.js';
import type { OperationLifecycleEvent } from './OperationLifecycleEvent.js';

const OPERATIONAL_STATE: OperationLifecycleStateEntity.Type = { 'variant': 'operational' };

class UnhandledEvent {
  public static throw(event: never): never {
    throw new Error(`Unhandled OperationLifecycleEvent: ${JSON.stringify(event)}`);
  }
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
  constructor() {
    super();
  }

  getInitialState(): OperationLifecycleStateEntity.Type {
    const result = OPERATIONAL_STATE;
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
  > {
    switch (event.type) {
      case 'AbortStarted':
        return { 'effects': [{ 'cancelledCount': event.cancelledCount, 'variant': 'FireOnAbortStart' }], 'state': state };
      case 'Acquired':
        return { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnAcquire' }], 'state': state };
      case 'ConcurrencyAdjusted':
        return { 'effects': [{ 'newLimit': event.newLimit, 'previousLimit': event.previousLimit, 'variant': 'FireOnAdaptiveAdjust' }], 'state': state };
      case 'Contended':
        return { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnContended' }], 'state': state };
      case 'DrainCompleted':
        return { 'effects': [{ 'totalExecuted': event.totalExecuted, 'variant': 'FireOnDrainComplete' }], 'state': state };
      case 'DrainStarted':
        return { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnDrainStart' }], 'state': state };
      case 'OperationRejected':
        return { 'effects': [{ 'reason': event.reason, 'variant': 'FireOnReject' }], 'state': state };
      case 'Queued':
        return { 'effects': [{ 'queuedCount': event.queuedCount, 'variant': 'FireOnAcquireWait' }], 'state': state };
      case 'SlotReleased':
        // Every outcome — queue handoff granted, throttle became idle, or still busy with
        // an empty queue — funnels through this single arm, which always returns exactly
        // one FireOnRelease effect. That is the fix: there is no switch arm, and therefore
        // no reachable event, that can produce zero or two onRelease fires.
        return { 'effects': [{ 'activeCount': event.activeCount, 'totalExecuted': event.totalExecuted, 'variant': 'FireOnRelease' }], 'state': state };
      case 'WindowSlid':
        return { 'effects': [{ 'activeCount': event.activeCount, 'queuedCount': event.queuedCount, 'variant': 'FireOnWindowSlide' }], 'state': state };
      default: return UnhandledEvent.throw(event);
    }
  }
}
