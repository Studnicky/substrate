import type { WorkerPoolContractSubjectInterface } from './WorkerPoolContractSubjectInterface.js';

/** Builds the pool under test for one WorkerPool adapter. */
export interface WorkerPoolContractHarnessInterface {
  create(options: {
    readonly 'maximumWorkers': number;
    readonly 'timeoutMs'?: number;
  }): WorkerPoolContractSubjectInterface;
  readonly 'name': string;
}
