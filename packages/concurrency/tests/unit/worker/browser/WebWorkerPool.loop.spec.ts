import { RuntimeError } from '@studnicky/errors/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import type {
  WebWorkerErrorEventInterface,
  WebWorkerInterface,
  WebWorkerMessageEventInterface,
  WorkerFactoryInterface,
  WorkerLeaseInterface,
  WorkerObservationInterface,
  WorkerPoolInterface,
  WorkerTransportInterface
} from '../../../../src/worker/browser/index.js';
import type { WorkerPoolContractHarnessInterface } from '../../../helpers/worker/WorkerPoolContractHarnessInterface.js';
import type { WorkerPoolContractItemInterface } from '../../../helpers/worker/WorkerPoolContractItemInterface.js';
import type { WorkerPoolContractSubjectInterface } from '../../../helpers/worker/WorkerPoolContractSubjectInterface.js';

import {
  WebWorkerFactory,
  WebWorkerMessageTransport,
  WebWorkerPool,
  WorkerLeasePool,
  WorkerPoolError
} from '../../../../src/worker/browser/index.js';
import { WorkerPoolContract } from '../../../helpers/worker/WorkerPoolContract.js';
import { WorkerResponseEntity } from './entities/WorkerResponseEntity.js';

class WorkerFixture implements WebWorkerInterface {
  readonly 'id': number;
  'terminated' = false;

  public constructor(id: number) {
    this.id = id;
  }

  public addEventListener(
    _type: 'error',
    _listener: (event: WebWorkerErrorEventInterface) => void,
  ): void;
  public addEventListener(
    _type: 'message',
    _listener: (event: WebWorkerMessageEventInterface) => void,
  ): void;
  public addEventListener(
    _type: 'error' | 'message',
    _listener:
      | ((event: WebWorkerErrorEventInterface) => void)
      | ((event: WebWorkerMessageEventInterface) => void)
  ): void {}

  public postMessage(_message: unknown): void {}

  public removeEventListener(
    _type: 'error',
    _listener: (event: WebWorkerErrorEventInterface) => void,
  ): void;
  public removeEventListener(
    _type: 'message',
    _listener: (event: WebWorkerMessageEventInterface) => void,
  ): void;
  public removeEventListener(
    _type: 'error' | 'message',
    _listener:
      | ((event: WebWorkerErrorEventInterface) => void)
      | ((event: WebWorkerMessageEventInterface) => void)
  ): void {}

  public terminate(): void {
    this.terminated = true;
  }
}

class WorkerFixtureObservation implements WorkerObservationInterface {
  readonly #worker: WebWorkerInterface;

  public constructor(worker: WebWorkerInterface) {
    this.#worker = worker;
  }

  public close(): void {}

  public isAlive(): boolean {
    const alive = !(this.#worker instanceof WorkerFixture) || !this.#worker.terminated;
    return alive;
  }
}

class MessageWorkerFixture implements WebWorkerInterface {
  #messageListener: ((event: WebWorkerMessageEventInterface) => void) | undefined;

  public addEventListener(
    ...arguments_:
      | readonly ['error', (event: WebWorkerErrorEventInterface) => void]
      | readonly ['message', (event: WebWorkerMessageEventInterface) => void]
  ): void {
    const [type, listener] = arguments_;

    if (type === 'message') {
      this.#messageListener = listener;
    }
  }

  public postMessage(_message: unknown): void {
    const listener = this.#messageListener;

    if (listener !== undefined) {
      listener({ 'data': { 'value': 'invalid' } });
    }
  }

  public removeEventListener(
    ..._arguments:
      | readonly ['error', (event: WebWorkerErrorEventInterface) => void]
      | readonly ['message', (event: WebWorkerMessageEventInterface) => void]
  ): void {}

  public terminate(): void {}
}

class WorkerFactory implements WorkerFactoryInterface<WebWorkerInterface> {
  public created = 0;
  public readonly workers: WorkerFixture[] = [];

  public create(): Promise<WebWorkerInterface> {
    this.created += 1;

    const worker = new WorkerFixture(this.created);
    this.workers.push(worker);
    const pending = Promise.resolve(worker);
    return pending;
  }

  public initialize(_worker: WebWorkerInterface): Promise<void> {
    const pending = Promise.resolve();
    return pending;
  }

  public observe(worker: WebWorkerInterface): WorkerObservationInterface {
    const observation = new WorkerFixtureObservation(worker);
    return observation;
  }

  public terminate(worker: WebWorkerInterface): Promise<void> {
    worker.terminate();
    const pending = Promise.resolve();
    return pending;
  }
}

class SlowWorkerFactory implements WorkerFactoryInterface<WebWorkerInterface> {
  public readonly workers: WorkerFixture[] = [];
  readonly #delayMs: number;
  #created = 0;

  public constructor(delayMs: number) {
    this.#delayMs = delayMs;
  }

  public async create(): Promise<WebWorkerInterface> {
    await setTimeout(this.#delayMs);
    this.#created += 1;
    const worker = new WorkerFixture(this.#created);
    this.workers.push(worker);
    return worker;
  }

  public initialize(_worker: WebWorkerInterface): Promise<void> {
    const pending = Promise.resolve();
    return pending;
  }

  public observe(worker: WebWorkerInterface): WorkerObservationInterface {
    const observation = new WorkerFixtureObservation(worker);
    return observation;
  }

  public terminate(worker: WebWorkerInterface): Promise<void> {
    worker.terminate();
    const pending = Promise.resolve();
    return pending;
  }
}

class WorkerTransport implements WorkerTransportInterface<WebWorkerInterface, number, string> {
  public request(worker: WebWorkerInterface, request: number): Promise<string> {
    const workerId = worker instanceof WorkerFixture ? worker.id : 0;
    const pending = Promise.resolve(`${String(workerId)}:${String(request)}`);
    return pending;
  }
}

class DeferredWorkerTransport implements WorkerTransportInterface<
  WebWorkerInterface,
  number,
  string
> {
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

class ContractWorkerTransport implements WorkerTransportInterface<
  WebWorkerInterface,
  WorkerPoolContractItemInterface,
  string
> {
  public async request(
    _worker: WebWorkerInterface,
    request: WorkerPoolContractItemInterface
  ): Promise<string> {
    if (request.ms !== undefined) {
      await setTimeout(request.ms);
    }
    if (request.error !== undefined) {
      throw RuntimeError.create(request.error);
    }
    return request.value;
  }
}

class ObservedWebWorkerPool extends WebWorkerPool<WorkerPoolContractItemInterface, string> {
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

class BrowserContractSubject implements WorkerPoolContractSubjectInterface {
  readonly pool: ObservedWebWorkerPool;
  readonly #controller = new AbortController();

  constructor(options: { readonly 'maximumWorkers': number; readonly 'timeoutMs'?: number }) {
    const poolOptions = {
      'abortSignal': this.#controller.signal,
      'factory': new WorkerFactory(),
      'maximumWorkers': options.maximumWorkers,
      'signal': Signal.create(),
      'transport': new ContractWorkerTransport(),
      ...(options.timeoutMs === undefined ? {} : { 'timeoutMs': options.timeoutMs })
    };
    this.pool = ObservedWebWorkerPool.create<
      WorkerPoolContractItemInterface,
      string,
      ObservedWebWorkerPool
    >(poolOptions);
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

class BrowserContractHarness implements WorkerPoolContractHarnessInterface {
  readonly name = 'Browser';

  create(options: {
    readonly 'maximumWorkers': number;
    readonly 'timeoutMs'?: number;
  }): WorkerPoolContractSubjectInterface {
    const subject = new BrowserContractSubject(options);
    return subject;
  }
}

class WebWorkerPoolTests {
  static declareAll(): void {
    WebWorkerPoolTests.declareTransportAndRunTests();
    WebWorkerPoolTests.declareTimeoutAndAbortTests();
    WebWorkerPoolTests.declareStartupTests();
    WebWorkerPoolTests.declareCloseAndFactoryTests();
  }

  private static declareCloseAndFactoryTests(): void {
    void it('allows active requests to settle before close releases browser workers', async () => {
      const factory = new WorkerFactory();
      const transport = new DeferredWorkerTransport();
      const pool = WebWorkerPool.create({
        'factory': factory,
        'maximumWorkers': 1,
        'transport': transport
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

    void it('rejects an arrow-valued Worker global as unavailable', async () => {
      const globalObject: object = globalThis;
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker');

      assert.equal(
        Reflect.set(globalObject, 'Worker', () => {}),
        true
      );

      try {
        const factory = WebWorkerFactory.create({ 'script': 'worker.js' });

        await assert.rejects(factory.create(), WorkerPoolError);
      } finally {
        if (descriptor === undefined) {
          assert.equal(Reflect.deleteProperty(globalObject, 'Worker'), true);
        } else {
          assert.equal(Reflect.set(globalObject, 'Worker', descriptor.value), true);
        }
      }
    });

    void it('rejects factory creation outside a Web Worker runtime', async () => {
      const factory = WebWorkerFactory.create({ 'script': 'worker.js' });

      await assert.rejects(factory.create(), (error) => {
        const caught: unknown = error;
        assert.equal(caught instanceof WorkerPoolError, true);
        assert.equal(
          caught instanceof Error && caught.message,
          'Web Workers are unavailable in this browser context'
        );
        return true;
      });
    });
  }

  private static declareStartupTests(): void {
    void it('rejects with a startup-specific error when worker creation exceeds startupTimeoutMs', async () => {
      const factory = new SlowWorkerFactory(200);
      const pool = WebWorkerPool.create({
        'factory': factory,
        'maximumWorkers': 1,
        'startupTimeoutMs': 1,
        'timeoutMs': 5000,
        'transport': new WorkerTransport()
      });

      await assert.rejects(pool.run([1]), (error) => {
        const caught: unknown = error;
        assert.ok(caught instanceof Error);
        assert.ok(caught.message.includes('did not finish starting'));
        assert.ok(!caught.message.includes('exceeded its timeout'));
        return true;
      });

      await pool.close();
    });

    void it('resolves an instant request within a short timeoutMs despite slow worker creation', async () => {
      const factory = new SlowWorkerFactory(50);
      const pool = WebWorkerPool.create({
        'factory': factory,
        'maximumWorkers': 1,
        'startupTimeoutMs': 5000,
        'timeoutMs': 10,
        'transport': new WorkerTransport()
      });

      const result = await pool.run([1]);
      assert.deepEqual(result, ['1:1']);

      await pool.close();
    });
  }

  private static declareTimeoutAndAbortTests(): void {
    void it('terminates the leased worker when a request times out', async () => {
      const factory = new WorkerFactory();
      const transport = new DeferredWorkerTransport();
      const pool = WebWorkerPool.create({
        'factory': factory,
        'maximumWorkers': 1,
        'timeoutMs': 1,
        'transport': transport
      });

      await WorkerPoolContract.assertRejectsWithMessage(pool.run([1]), ['exceeded its timeout']);
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
        'transport': transport
      });
      const run = pool.run([1]);

      await transport.waitForRequest();
      assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
      controller.abort(RuntimeError.create('cancelled by test'));

      await WorkerPoolContract.assertRejectsWithMessage(run, ['cancelled']);
      assert.equal(factory.workers[0]?.terminated, true);
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0);

      await pool.close();
    });

    void it('cancels a request via the caller signal while its worker is still starting', async () => {
      const controller = new AbortController();
      const factory = new SlowWorkerFactory(500);
      const cancellationReason = RuntimeError.create('cancelled during startup');
      const pool = WebWorkerPool.create({
        'abortSignal': controller.signal,
        'factory': factory,
        'maximumWorkers': 1,
        'startupTimeoutMs': 5000,
        'transport': new WorkerTransport()
      });

      const run = pool.run([1]);
      await setTimeout(20);
      assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
      controller.abort(cancellationReason);

      await assert.rejects(run, (error) => {
        const caught: unknown = error;
        assert.ok(caught instanceof Error);
        assert.ok(caught.message.includes('finished starting'));
        return true;
      });
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0);

      await pool.close();
    });
  }

  private static declareTransportAndRunTests(): void {
    void it('rejects malformed worker messages through the entity intake boundary', async () => {
      const worker = new MessageWorkerFixture();
      const transport = WebWorkerMessageTransport.fromEntity<number, WorkerResponseEntity.Type>(
        WorkerResponseEntity.intake
      );

      await WorkerPoolContract.assertRejectsWithMessage(transport.request(worker, 1), [
        'must be number'
      ]);
    });

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

      await WorkerPoolContract.assertRejectsWithMessage(pool.run([4]), ['closed']);
    });
  }
}

void describe('WebWorkerPool', () => {
  WebWorkerPoolTests.declareAll();
});

WorkerPoolContract.register(new BrowserContractHarness());
