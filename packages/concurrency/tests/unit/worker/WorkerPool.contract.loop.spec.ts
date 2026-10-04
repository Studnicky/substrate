import { RuntimeError } from '@studnicky/errors/node';
import { Signal } from '@studnicky/signal/node';
import { resolve } from 'node:path';

import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';
import type { WorkerPoolContractHarnessInterface } from '../../helpers/worker/WorkerPoolContractHarnessInterface.js';
import type { WorkerPoolContractItemInterface } from '../../helpers/worker/WorkerPoolContractItemInterface.js';
import type { WorkerPoolContractSubjectInterface } from '../../helpers/worker/WorkerPoolContractSubjectInterface.js';

import { WorkerPool } from '../../../src/worker/WorkerPool.js';
import { WorkerPoolContract } from '../../helpers/worker/WorkerPoolContract.js';

class ObservedWorkerPool extends WorkerPool<WorkerPoolContractItemInterface, string> {
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

class NodeContractSubject implements WorkerPoolContractSubjectInterface {
  readonly pool: ObservedWorkerPool;
  readonly #controller = new AbortController();

  constructor(options: { readonly 'maximumWorkers': number; readonly 'timeoutMs'?: number }) {
    const config: WorkerPoolConfigInterface = {
      'abortSignal': this.#controller.signal,
      'batchConcurrency': options.maximumWorkers,
      'concurrency': options.maximumWorkers,
      'signal': Signal.create(),
      'workerPath': resolve(import.meta.dirname, '../../fixtures/worker/reusableEchoWorker.ts')
    };
    if (options.timeoutMs !== undefined) {
      config.timeoutMs = options.timeoutMs;
    }
    this.pool = ObservedWorkerPool.create<
      WorkerPoolContractItemInterface,
      string,
      ObservedWorkerPool
    >(config);
  }

  abort(): void {
    this.#controller.abort(RuntimeError.create('contract cancellation'));
  }

  getCreatedWorkerCount(): number {
    const created = this.pool.getCreatedWorkerCount();
    return created;
  }

  getErrorCount(): number {
    const errors = this.pool.getErrorCount();
    return errors;
  }

  getTimeoutCount(): number {
    const timeouts = this.pool.getTimeoutCount();
    return timeouts;
  }
}

class NodeContractHarness implements WorkerPoolContractHarnessInterface {
  readonly name = 'Node';

  create(options: {
    readonly 'maximumWorkers': number;
    readonly 'timeoutMs'?: number;
  }): WorkerPoolContractSubjectInterface {
    const subject = new NodeContractSubject(options);
    return subject;
  }
}

WorkerPoolContract.register(new NodeContractHarness());
