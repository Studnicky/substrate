/**
 * Guards the "retry once, then reject" rule structurally. Ports `run()`'s own `!context.retried`
 * inline boolean check as a terminal-state transition: the worker `'exit'` handler calls
 * `transition()` against the failing task's `retryState` when the worker vanishes mid-task; a
 * second unexpected exit for the same task lands on `isTerminated()` and throws
 * `MachineTerminatedError`, which the caller catches and treats as "retries exhausted — reject"
 * instead of re-checking a mutable flag.
 *
 * One `RetryGuardMachine` is instantiated fresh inside each `run()` call, alongside every other
 * piece of that call's per-run bookkeeping — never hoisted to an instance field.
 *
 * Mirrors the PHP port's `RetryGuardMachine` — see
 * `substrate-php/packages/worker-pool/src/Internal/Fsm/RetryGuardMachine.php`.
 */
import type { FsmStepInterface } from '@studnicky/fsm/node';

import { StateMachine } from '@studnicky/fsm/node';

import type { RequestRetryEventEntity } from './entities/RequestRetryEventEntity.js';
import type { RetryGuardStateEntity } from './entities/RetryGuardStateEntity.js';

export class RetryGuardMachine extends StateMachine<RetryGuardStateEntity.Type, RequestRetryEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): RetryGuardStateEntity.Type {
    return { 'variant': 'notRetried' };
  }

  protected override isTerminated(state: RetryGuardStateEntity.Type): boolean {
    const result = state.variant === 'retried';
    return result;
  }

  override reduce(
    _state: RetryGuardStateEntity.Type,
    _event: RequestRetryEventEntity.Type
  ): FsmStepInterface<RetryGuardStateEntity.Type, never> {
    return { 'effects': [], 'state': { 'variant': 'retried' } };
  }
}
