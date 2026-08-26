import type { TaskSettlementStateEntity } from '../entities/TaskSettlementStateEntity.js';

/** Wraps `TaskSettlementStateEntity.Type` in the `{ readonly variant }` shape `StateMachine` requires. */
export interface TaskSettlementStateInterface {
  readonly 'variant': TaskSettlementStateEntity.Type;
}
