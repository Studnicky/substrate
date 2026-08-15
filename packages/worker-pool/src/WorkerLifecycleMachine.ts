/**
 * Formalizes one worker's `idle → busy` (a task is posted), `busy → idle` (its task settled and
 * no pending entry was waiting), and `idle|busy → dead` (terminated or exited) lifecycle, `dead`
 * being terminal.
 *
 * `WorkerPool#run()` already kept this bookkeeping correctly scoped — one closure-local record
 * per worker, never on `this` — so this machine does not relocate any state. It replaces what
 * used to be two parallel structures (`liveWorkers: Map<Worker, number>` tracking "is this worker
 * still alive" and `idleWorkers: Worker[]` tracking "is this worker available right now") with a
 * single `WorkerRecordInterface` per worker whose `lifecycleState` transitions go through this
 * machine instead of ad hoc map/array surgery at each call site. `isTerminated()` reporting `dead`
 * as terminal means a worker can only be killed once, structurally: a second `'kill'` event throws
 * `MachineTerminatedError` rather than re-running termination bookkeeping.
 *
 * Mirrors the PHP port's `WorkerLifecycleMachine` — see
 * `substrate-php/packages/worker-pool/src/Internal/Fsm/WorkerLifecycleMachine.php` — with one
 * TS-specific difference: `run()`'s `freeWorker()` always makes a worker available (pushes it
 * onto the idle pool) when there is no queued entry to hand it, even for a worker whose lifecycle
 * state is already `'idle'` (a freshly created replacement that never got a task). Only the
 * `'busy' → 'idle'` case is a *transition* worth guarding through this machine; pushing an
 * already-idle worker onto the pool is not an illegal edge; it is a no-op transition that
 * `run()` simply skips requesting.
 */
import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { WorkerLifecycleEventEntity } from './entities/WorkerLifecycleEventEntity.js';
import type { WorkerLifecycleStateInterface } from './interfaces/WorkerLifecycleStateInterface.js';

export class WorkerLifecycleMachine extends StateMachine<
  WorkerLifecycleStateInterface,
  WorkerLifecycleEventEntity.Type,
  never
> {
  constructor() {
    super();
  }

  override getInitialState(): WorkerLifecycleStateInterface {
    return { 'variant': 'idle' };
  }

  protected override isTerminated(state: WorkerLifecycleStateInterface): boolean {
    const result = state.variant === 'dead';
    return result;
  }

  override reduce(
    state: WorkerLifecycleStateInterface,
    event: WorkerLifecycleEventEntity.Type
  ): FsmStepInterface<WorkerLifecycleStateInterface, never> {
    if (event.type === 'assign' && state.variant === 'idle') {
      return { 'effects': [], 'state': { 'variant': 'busy' } };
    }
    if (event.type === 'free' && state.variant === 'busy') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }
    if (event.type === 'kill') {
      return { 'effects': [], 'state': { 'variant': 'dead' } };
    }

    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `illegal worker edge ${state.variant} -> ${event.type}`,
      'stateVariant': state.variant
    });
  }
}
