import type { WorkerObservationInterface } from './WorkerObservationInterface.js';

export interface WorkerFactoryInterface<TWorker> {
  create(): Promise<TWorker>;
  initialize(worker: TWorker): Promise<void>;
  observe(worker: TWorker): WorkerObservationInterface;
  terminate(worker: TWorker): Promise<void>;
}
