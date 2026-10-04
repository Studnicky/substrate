import type { WorkerPoolInterface } from '../../../src/worker/interfaces/WorkerPoolInterface.js';
import type { WorkerPoolContractItemInterface } from './WorkerPoolContractItemInterface.js';

/** A pool plus the lifecycle observations the shared WorkerPool contract asserts on. */
export interface WorkerPoolContractSubjectInterface {
  abort(): void;
  getCreatedWorkerCount(): number;
  getErrorCount(): number;
  getTimeoutCount(): number;
  readonly 'pool': WorkerPoolInterface<WorkerPoolContractItemInterface, string>;
}
