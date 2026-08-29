import type { WorkerTransportInterface } from './WorkerTransportInterface.js';

export interface WorkerLeaseInterface<TWorker> {
  isAlive(): boolean;
  release(): Promise<void>;
  /** Delegates one caller-owned request; the transport owns cancellation, including during pool close. */
  request<TRequest, TResponse>(
    transport: WorkerTransportInterface<TWorker, TRequest, TResponse>,
    request: TRequest
  ): Promise<TResponse>;
  readonly 'worker': TWorker;
}
