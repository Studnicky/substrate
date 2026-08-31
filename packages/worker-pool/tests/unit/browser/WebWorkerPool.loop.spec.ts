import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Signal } from '@studnicky/signal';

import type {
  WorkerFactoryInterface,
  WorkerLeaseInterface,
  WorkerObservationInterface,
  WorkerPoolInterface,
  WorkerTransportInterface,
  WebWorkerErrorEventInterface,
  WebWorkerInterface,
  WebWorkerMessageEventInterface
} from '../../../src/browser/index.js';
import {
  WebWorkerFactory,
  WebWorkerPool,
  WorkerPoolError,
  WorkerLeasePool
} from '../../../src/browser/index.js';
import { registerWorkerPoolContract } from '../../helpers/registerWorkerPoolContract.js';

interface ContractItemInterface {
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': string;
}

class WorkerFixture implements WebWorkerInterface {
  readonly 'id': number;
  'terminated' = false;

  public constructor(id: number) {
    this.id = id;
  }

  public addEventListener(_type: 'error', _listener: (event: WebWorkerErrorEventInterface) => void): void;
  public addEventListener(_type: 'message', _listener: (event: WebWorkerMessageEventInterface) => void): void;
  public addEventListener(
    _type: 'error' | 'message',
    _listener: ((event: WebWorkerErrorEventInterface) => void) | ((event: WebWorkerMessageEventInterface) => void)
  ): void {}

  public postMessage(_message: unknown): void {}

  public removeEventListener(_type: 'error', _listener: (event: WebWorkerErrorEventInterface) => void): void;
  public removeEventListener(_type: 'message', _listener: (event: WebWorkerMessageEventInterface) => void): void;
  public removeEventListener(
    _type: 'error' | 'message',
    _listener: ((event: WebWorkerErrorEventInterface) => void) | ((event: WebWorkerMessageEventInterface) => void)
  ): void {}

  public terminate(): void {
    this.terminated = true;
  }
}

class WorkerFactory implements WorkerFactoryInterface<WebWorkerInterface> {
  public created = 0;
  public readonly workers: WorkerFixture[] = [];

  public async create(): Promise<WebWorkerInterface> {
    this.created += 1;

    const worker = new WorkerFixture(this.created);
    this.workers.push(worker);
    return worker;
  }

  public async initialize(_worker: WebWorkerInterface): Promise<void> {}

  public observe(worker: WebWorkerInterface): WorkerObservationInterface {
    return {
      'close': (): void => {},
      'isAlive': (): boolean => {
        const result = !(worker instanceof WorkerFixture) || !worker.terminated;
        return result;
      }
    };
  }

  public async terminate(worker: WebWorkerInterface): Promise<void> {
    worker.terminate();
  }
}

class WorkerTransport implements WorkerTransportInterface<WebWorkerInterface, number, string> {
  public async request(worker: WebWorkerInterface, request: number): Promise<string> {
    const workerId = worker instanceof WorkerFixture ? worker.id : 0;
    return `${String(workerId)}:${String(request)}`;
  }
}

class DeferredWorkerTransport implements WorkerTransportInterface<WebWorkerInterface, number, string> {
  readonly #result = Promise.withResolvers<string>();
  readonly #started = Promise.withResolvers<void>();

  public request(_worker: WebWorkerInterface, _request: number): Promise<string> {
    this.#started.resolve();
    return this.#result.promise;
  }

  public async waitForRequest(): Promise<void> {
    await this.#started.promise;
  }

  public resolve(value: string): void {
    this.#result.resolve(value);
  }
}

class ContractWorkerTransport implements WorkerTransportInterface<WebWorkerInterface, ContractItemInterface, string> {
  public async request(_worker: WebWorkerInterface, request: ContractItemInterface): Promise<string> {
    if (request.ms !== undefined) {
      await new Promise<void>((resolve): void => { setTimeout(resolve, request.ms); });
    }
    if (request.error !== undefined) {
      throw new Error(request.error);
    }
    return request.value;
  }
}

class ObservedWebWorkerPool extends WebWorkerPool<ContractItemInterface, string> {
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

  protected override onWorkerCreated(_worker: WebWorkerInterface): void {
    this.#createdWorkerCount += 1;
  }

  protected override onWorkerError(_error: Error): void {
    this.#errorCount += 1;
  }

  protected override onWorkerTimeout(): void {
    this.#timeoutCount += 1;
  }
}

void describe('WebWorkerPool', () => {
  void it('satisfies the shared pool contract with bounded, ordered runs', async () => {
    const factory = new WorkerFactory();
    const pool: WorkerPoolInterface<number, string> = WebWorkerPool.create({
      'factory': factory,
      'maximumWorkers': 2,
      'transport': new WorkerTransport()
    });

    const result = await pool.run([1, 2, 3]);

    assert.deepEqual(result, ['1:1', '2:2', '2:3']);
    assert.equal(factory.created, 2);

    await pool.close();

    await assert.rejects(pool.run([4]), /closed/u);
  });

  void it('terminates the leased worker when a request times out', async () => {
    const factory = new WorkerFactory();
    const transport = new DeferredWorkerTransport();
    const pool = WebWorkerPool.create({
      'factory': factory,
      'maximumWorkers': 1,
      'timeoutMs': 1,
      transport
    });

    await assert.rejects(pool.run([1]), /exceeded its timeout/u);
    assert.equal(factory.workers[0]?.terminated, true);

    await pool.close();
  });

  void it('terminates the leased worker when the pool signal aborts', async () => {
    const controller = new AbortController();
    const factory = new WorkerFactory();
    const transport = new DeferredWorkerTransport();
    const pool = WebWorkerPool.create({
      'abortSignal': controller.signal,
      'factory': factory,
      'maximumWorkers': 1,
      'signal': Signal.create(),
      transport
    });
    const run = pool.run([1]);

    await transport.waitForRequest();
    controller.abort(new Error('cancelled by test'));

    await assert.rejects(run, /cancelled/u);
    assert.equal(factory.workers[0]?.terminated, true);

    await pool.close();
  });

  void it('allows active requests to settle before close releases browser workers', async () => {
    const factory = new WorkerFactory();
    const transport = new DeferredWorkerTransport();
    const pool = WebWorkerPool.create({
      'factory': factory,
      'maximumWorkers': 1,
      transport
    });
    const run = pool.run([1]);

    await transport.waitForRequest();
    const close = pool.close();
    assert.equal(factory.workers[0]?.terminated, false);
    transport.resolve('completed');

    assert.deepEqual(await run, ['completed']);
    await close;
    assert.equal(factory.workers[0]?.terminated, true);
  });

  void it('exports the lease contract from the browser entrypoint', async () => {
    const factory = new WorkerFactory();
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const lease: WorkerLeaseInterface<WebWorkerInterface> = await pool.acquire();

    await lease.release();
    await pool.close();
  });

  void it('rejects factory creation outside a Web Worker runtime', async () => {
    const factory = WebWorkerFactory.create({ 'script': 'worker.js' });

    await assert.rejects(factory.create(), (error: unknown): boolean => {
      assert.equal(error instanceof WorkerPoolError, true);
      assert.equal(error instanceof Error && error.message, 'Web Workers are unavailable in this browser context');
      return true;
    });
  });
});

registerWorkerPoolContract({
  'create': (options) => {
    const controller = new AbortController();
    const factory = new WorkerFactory();
    const poolOptions = {
      'abortSignal': controller.signal,
      'factory': factory,
      'maximumWorkers': options.maximumWorkers,
      'signal': Signal.create(),
      'transport': new ContractWorkerTransport(),
      ...(options.timeoutMs === undefined ? {} : { 'timeoutMs': options.timeoutMs })
    };
    const pool = ObservedWebWorkerPool.create<ContractItemInterface, string, ObservedWebWorkerPool>(poolOptions);

    return {
      'abort': (): void => { controller.abort(new Error('contract cancellation')); },
      'getCreatedWorkerCount': (): number => { return pool.getCreatedWorkerCount(); },
      'getErrorCount': (): number => { return pool.getErrorCount(); },
      'getTimeoutCount': (): number => { return pool.getTimeoutCount(); },
      'pool': pool
    };
  },
  'name': 'Browser'
});
