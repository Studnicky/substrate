import type { Signal } from '@studnicky/signal';

import type { WorkerFactoryInterface } from '../interfaces/WorkerFactoryInterface.js';
import type { WorkerTransportInterface } from '../interfaces/WorkerTransportInterface.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';

export interface WebWorkerPoolOptionsInterface<TInput, TOutput> {
  readonly 'abortSignal'?: AbortSignal;
  readonly 'factory': WorkerFactoryInterface<WebWorkerInterface>;
  readonly 'maximumWorkers': number;
  readonly 'signal'?: Signal;
  readonly 'timeoutMs'?: number;
  readonly 'transport': WorkerTransportInterface<WebWorkerInterface, TInput, TOutput>;
}
