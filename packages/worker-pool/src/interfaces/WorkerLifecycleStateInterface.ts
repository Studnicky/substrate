import type { WorkerLifecycleStateEntity } from '../entities/WorkerLifecycleStateEntity.js';

/** Wraps `WorkerLifecycleStateEntity.Type` in the `{ readonly variant }` shape `StateMachine` requires. */
export interface WorkerLifecycleStateInterface {
  readonly 'variant': WorkerLifecycleStateEntity.Type;
}
