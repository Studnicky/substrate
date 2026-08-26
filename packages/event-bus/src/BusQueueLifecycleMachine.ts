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

import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

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
    switch (state.variant) {
      case 'aborted':
        // Unreachable: `isTerminated()` short-circuits `transition()` before
        // `reduce()` runs for any event once the state is `aborted`.
        break;
      case 'aborting':
        switch (event.type) {
          case 'abort':
            // Idempotent: abort already requested for this loop; the
            // `releaseForAbort` effect must not fire a second time.
            return { 'effects': [], 'state': state };
          case 'loopFinished':
            return { 'effects': [], 'state': { 'variant': 'aborted' } };
          case 'startLoop':
            return { 'effects': [], 'state': state };
        }
        break;
      case 'draining':
        switch (event.type) {
          case 'abort':
            return { 'effects': [{ 'variant': 'releaseForAbort' }], 'state': { 'variant': 'aborting' } };
          case 'loopFinished':
            return { 'effects': [], 'state': { 'variant': 'open' } };
          case 'startLoop':
            // Idempotent: a loop is already running. `BusQueue#scheduleLoop`
            // never actually dispatches this from `draining` (it guards on
            // `open` first), but the reducer stays total rather than relying
            // on that caller-side guard as the only safety net.
            return { 'effects': [], 'state': state };
        }
        break;
      case 'open':
        switch (event.type) {
          case 'abort':
            return { 'effects': [{ 'variant': 'releaseForAbort' }], 'state': { 'variant': 'aborted' } };
          case 'startLoop':
            return { 'effects': [], 'state': { 'variant': 'draining' } };
          case 'loopFinished':
            throw new TransitionRejectedError({
              'eventType': event.type,
              'reason': 'no drain loop is running in state \'open\'',
              'stateVariant': state.variant
            });
        }
        break;
    }
    throw new Error(`BusQueueLifecycleMachine: unhandled event '${event.type}' in state '${state.variant}'`);
  }
}
