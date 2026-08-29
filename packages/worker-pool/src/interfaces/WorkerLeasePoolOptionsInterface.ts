import type { WorkerFactoryInterface } from './WorkerFactoryInterface.js';

export interface WorkerLeasePoolOptionsInterface<TWorker> {
  readonly 'factory': WorkerFactoryInterface<TWorker>;
  readonly 'maximumLeases': number;
}
