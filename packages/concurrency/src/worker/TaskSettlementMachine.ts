/**
 * Guards the "a task settles at most once" invariant structurally. Ports `run()`'s own
 * `settleTask()` closure — `if (context === undefined || context.settled) { return false; }` — as
 * a terminal-state transition instead of a boolean re-checked ad hoc at each of the several call
 * sites that resolve, reject, or time out a task.
 *
 * One `TaskSettlementMachine` is instantiated fresh inside each `run()` call, alongside every
 * other piece of that call's per-run bookkeeping — never hoisted to an instance field. Each
 * in-flight task's own `TaskContextInterface` carries its own `settlementState`, starting at
 * `'unsettled'`; `run()`'s `settleTask()` calls `transition()` against that per-task state. A
 * second attempt lands on `isTerminated()` and throws `MachineTerminatedError`, which the caller
 * catches and treats as a silent no-op — exactly the prior `return false`.
 *
 * Mirrors the PHP port's `TaskSettlementMachine` — see
 * `substrate-php/packages/worker-pool/src/Internal/Fsm/TaskSettlementMachine.php`.
 */
import type { FsmStepInterface } from '@studnicky/fsm/node';

import { StateMachine } from '@studnicky/fsm/node';

import type { SettleTaskEventEntity } from './entities/SettleTaskEventEntity.js';
import type { TaskSettlementStateEntity } from './entities/TaskSettlementStateEntity.js';

export class TaskSettlementMachine extends StateMachine<TaskSettlementStateEntity.Type, SettleTaskEventEntity.Type, never> {
  constructor() {
    super();
  }

  override getInitialState(): TaskSettlementStateEntity.Type {
    return { 'variant': 'unsettled' };
  }

  protected override isTerminated(state: TaskSettlementStateEntity.Type): boolean {
    const result = state.variant === 'settled';
    return result;
  }

  override reduce(
    _state: TaskSettlementStateEntity.Type,
    _event: SettleTaskEventEntity.Type
  ): FsmStepInterface<TaskSettlementStateEntity.Type, never> {
    return { 'effects': [], 'state': { 'variant': 'settled' } };
  }
}
