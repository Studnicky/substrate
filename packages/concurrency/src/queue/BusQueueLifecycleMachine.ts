/**
 * Internal `@studnicky/fsm` reducer for `BusQueue`'s admission/drain lifecycle.
 *
 * Replaces the four loosely-coordinated fields the class used to track by
 * hand (`#draining`, `#aborted`, plus the `#drainTask`/`#activeEntry`
 * bookkeeping those flags gated) with a single enumerated state:
 *
 * - `open`     — idle; no drain loop running, not aborted.
 * - `draining` — a drain loop is actively shifting and processing entries.
 * - `aborting` — abort has been requested while a drain loop was in flight;
 *                the loop finishes (or abandons) its current entry, then
 *                exits without starting on any further entry.
 * - `aborted`  — terminal. No further loop may start; new `enqueue()` calls
 *                are dropped.
 *
 * `open` and `draining` cycle into each other any number of times over the
 * queue's life (`startLoop` / `loopFinished`). `abort` is reachable from
 * either and always carries the `releaseForAbort` effect — cancelling the
 * in-flight entry (if any) and releasing every backpressure/drain waiter —
 * exactly once, regardless of which of the two states it was requested from.
 * `aborted` is marked terminal via `isTerminated()`, so a second `abort`
 * dispatch (which should never happen given `BusQueue`'s single abort call
 * site, but previously had no structural guard at all) is rejected by the
 * base `StateMachine` before `reduce()` ever runs, rather than silently
 * re-running cancellation logic against already-cleared bookkeeping.
 */



import type { FsmStepInterface} from '#runtime';

import { RuntimeError, StateMachine, TransitionRejectedError } from '#runtime';

import type { BusQueueAbortedStateEntity } from './entities/BusQueueAbortedStateEntity.js';
import type { BusQueueAbortEventEntity } from './entities/BusQueueAbortEventEntity.js';
import type { BusQueueAbortingStateEntity } from './entities/BusQueueAbortingStateEntity.js';
import type { BusQueueDrainingStateEntity } from './entities/BusQueueDrainingStateEntity.js';
import type { BusQueueLoopFinishedEventEntity } from './entities/BusQueueLoopFinishedEventEntity.js';
import type { BusQueueOpenStateEntity } from './entities/BusQueueOpenStateEntity.js';
import type { BusQueueReleaseForAbortEffectEntity } from './entities/BusQueueReleaseForAbortEffectEntity.js';
import type { BusQueueStartLoopEventEntity } from './entities/BusQueueStartLoopEventEntity.js';

export class BusQueueLifecycleMachine extends StateMachine<
  BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
  BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type,
  BusQueueReleaseForAbortEffectEntity.Type
> {
  constructor() {
    super();
  }

  override getInitialState(): BusQueueOpenStateEntity.Type {
    return { 'variant': 'open' };
  }

  protected override isTerminated(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type
  ): boolean {
    const result = state.variant === 'aborted';
    return result;
  }

  override reduce(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    const transitionsForState = BusQueueLifecycleMachine.#transitions.get(state.variant);
    const transition = transitionsForState?.get(event.type);
    if (transition !== undefined) {
      const result = transition(state, event);
      return result;
    }
    throw RuntimeError.create(`BusQueueLifecycleMachine: unhandled event '${event.type}' in state '${state.variant}'`);
  }

  // Idempotent: abort already requested for this loop; the `releaseForAbort` effect must not fire a second time.
  static #abortingAbort(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': state };
  }

  static #abortingLoopFinished(
    _state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': { 'variant': 'aborted' } };
  }

  static #abortingStartLoop(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': state };
  }

  static #drainingAbort(
    _state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [{ 'variant': 'releaseForAbort' }], 'state': { 'variant': 'aborting' } };
  }

  static #drainingLoopFinished(
    _state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': { 'variant': 'open' } };
  }

  // Idempotent: a loop is already running. `BusQueue#scheduleLoop` guards on `open` before dispatching, but the reducer stays total.
  static #drainingStartLoop(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': state };
  }

  static #openAbort(
    _state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [{ 'variant': 'releaseForAbort' }], 'state': { 'variant': 'aborted' } };
  }

  static #openStartLoop(
    _state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    _event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  > {
    return { 'effects': [], 'state': { 'variant': 'draining' } };
  }

  static #openLoopFinished(
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ): never {
    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': 'no drain loop is running in state \'open\'',
      'stateVariant': state.variant
    });
  }

  // Transition table keyed by (currentState, event). `aborted` has no entries:
  // `isTerminated()` rejects every event from that state before `reduce()` runs.
  static readonly #transitions = new Map<string, Map<string, (
    state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
  ) => FsmStepInterface<
    BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
    BusQueueReleaseForAbortEffectEntity.Type
  >>>([
    ['aborting', new Map<string, (
      state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
    ) => FsmStepInterface<
      BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      BusQueueReleaseForAbortEffectEntity.Type
    >>([
      ['abort', BusQueueLifecycleMachine.#abortingAbort],
      ['loopFinished', BusQueueLifecycleMachine.#abortingLoopFinished],
      ['startLoop', BusQueueLifecycleMachine.#abortingStartLoop]
    ])],
    ['draining', new Map<string, (
      state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
    ) => FsmStepInterface<
      BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      BusQueueReleaseForAbortEffectEntity.Type
    >>([
      ['abort', BusQueueLifecycleMachine.#drainingAbort],
      ['loopFinished', BusQueueLifecycleMachine.#drainingLoopFinished],
      ['startLoop', BusQueueLifecycleMachine.#drainingStartLoop]
    ])],
    ['open', new Map<string, (
      state: BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      event: BusQueueStartLoopEventEntity.Type | BusQueueLoopFinishedEventEntity.Type | BusQueueAbortEventEntity.Type
    ) => FsmStepInterface<
      BusQueueOpenStateEntity.Type | BusQueueDrainingStateEntity.Type | BusQueueAbortingStateEntity.Type | BusQueueAbortedStateEntity.Type,
      BusQueueReleaseForAbortEffectEntity.Type
    >>([
      ['abort', BusQueueLifecycleMachine.#openAbort],
      ['loopFinished', BusQueueLifecycleMachine.#openLoopFinished],
      ['startLoop', BusQueueLifecycleMachine.#openStartLoop]
    ])]
  ]);
}
