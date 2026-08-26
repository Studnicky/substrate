/**
 * Single point of truth for firing `onWorkerError`, driven by `@studnicky/fsm`'s `StateMachine`.
 * Mirrors `Throttle`'s `OperationLifecycleMachine`: the machine has exactly one state variant
 * (`'operational'`) because there is nothing per-failure worth naming a state — a worker failure
 * is an instantaneous event, not a mode. What matters is `reduce()`'s contract, not the state
 * graph: for the one event this machine handles, the switch returns an `effects` array containing
 * exactly one `FireOnWorkerError` effect.
 *
 * `run()` calls `onWorkerError` from several distinct scenarios — a pre-dispatch abort, an
 * explicit `'error'` envelope, an uncaught worker `'error'` event, a worker-termination failure
 * following an abort/timeout, and a worker-termination failure during final shutdown. Every one of
 * those call sites constructs a `WorkerFailureEvent` and calls `run()`'s single
 * `reportWorkerError()` helper, which is the only place that runs this machine's `transition()`
 * and the only place that applies the resulting `FireOnWorkerError` effect — the hook itself never
 * fires anywhere else. Because `reduce()` has one unconditional arm that always returns exactly
 * one effect, no call path through this reducer can produce zero or two fires for a given failure.
 *
 * Mirrors the PHP port's `WorkerFailureMachine` — see
 * `substrate-php/packages/worker-pool/src/Internal/Fsm/WorkerFailureMachine.php`. One
 * `WorkerFailureMachine` is instantiated fresh inside each `run()` call, alongside every other
 * piece of that call's per-run bookkeeping — never hoisted to an instance field.
 */
import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine } from '@studnicky/fsm';

import type { FireOnWorkerErrorEffectInterface } from './interfaces/FireOnWorkerErrorEffectInterface.js';
import type { WorkerFailureEventInterface } from './interfaces/WorkerFailureEventInterface.js';
import type { WorkerFailureStateInterface } from './interfaces/WorkerFailureStateInterface.js';

const OPERATIONAL_STATE: WorkerFailureStateInterface = { 'variant': 'operational' };

export class WorkerFailureMachine extends StateMachine<
  WorkerFailureStateInterface,
  WorkerFailureEventInterface,
  FireOnWorkerErrorEffectInterface
> {
  constructor() {
    super();
  }

  override getInitialState(): WorkerFailureStateInterface {
    const result = OPERATIONAL_STATE;
    return result;
  }

  override reduce(
    state: WorkerFailureStateInterface,
    event: WorkerFailureEventInterface
  ): FsmStepInterface<WorkerFailureStateInterface, FireOnWorkerErrorEffectInterface> {
    const result: FsmStepInterface<WorkerFailureStateInterface, FireOnWorkerErrorEffectInterface> = {
      'effects': [{ 'error': event.error, 'index': event.index, 'variant': 'FireOnWorkerError' }],
      'state': state
    };
    return result;
  }
}
