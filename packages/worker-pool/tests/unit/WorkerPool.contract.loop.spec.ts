import { fileURLToPath } from 'node:url';

import { Signal } from '@studnicky/signal';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import { registerWorkerPoolContract } from '../helpers/registerWorkerPoolContract.js';

interface ContractItemInterface {
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': string;
}

class ObservedWorkerPool extends WorkerPool<ContractItemInterface, string> {
  #createdWorkerCount = 0;
  #errorCount = 0;
  #timeoutCount = 0;

  public getCreatedWorkerCount(): number {
    return this.#createdWorkerCount;
  }

  public getErrorCount(): number {
    return this.#errorCount;
  }

  public getTimeoutCount(): number {
    return this.#timeoutCount;
  }

  protected override onWorkerCreated(_threadId: number): void {
    this.#createdWorkerCount += 1;
  }

  protected override onWorkerError(_error: Error, _index: number): void {
    this.#errorCount += 1;
  }

  protected override onWorkerTimeout(_index: number): void {
    this.#timeoutCount += 1;
  }
}

registerWorkerPoolContract({
  'create': (options) => {
    const controller = new AbortController();
    const config: WorkerPoolConfigInterface = {
      'abortSignal': controller.signal,
      'batchConcurrency': options.maximumWorkers,
      'concurrency': options.maximumWorkers,
      'signal': Signal.create(),
      'workerPath': fileURLToPath(new URL('../fixtures/reusableEchoWorker.mjs', import.meta.url))
    };
    if (options.timeoutMs !== undefined) {
      config.timeoutMs = options.timeoutMs;
    }
    const pool = ObservedWorkerPool.create<ContractItemInterface, string, ObservedWorkerPool>(config);

    return {
      'abort': (): void => { controller.abort(new Error('contract cancellation')); },
      'getCreatedWorkerCount': (): number => { return pool.getCreatedWorkerCount(); },
      'getErrorCount': (): number => { return pool.getErrorCount(); },
      'getTimeoutCount': (): number => { return pool.getTimeoutCount(); },
      'pool': pool
    };
  },
  'name': 'Node'
});
