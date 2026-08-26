import type { WorkerFailureStateEntity } from '../entities/WorkerFailureStateEntity.js';

/** The machine has a single state variant — see `WorkerFailureMachine.ts` module doc for why. */
export interface WorkerFailureStateInterface {
  readonly 'variant': WorkerFailureStateEntity.Type;
}
