import { Semaphore } from '@studnicky/concurrency';
import { Predicates } from '@studnicky/types';

import type { WorkerFactoryInterface } from './interfaces/WorkerFactoryInterface.js';
import type { WorkerLeaseInterface } from './interfaces/WorkerLeaseInterface.js';
import type { WorkerLeasePoolOptionsInterface } from './interfaces/WorkerLeasePoolOptionsInterface.js';
import type { WorkerLifecycleStateInterface } from './interfaces/WorkerLifecycleStateInterface.js';
import type { WorkerObservationInterface } from './interfaces/WorkerObservationInterface.js';
import type { WorkerTransportInterface } from './interfaces/WorkerTransportInterface.js';

import { WorkerPoolError } from './errors/index.js';
import { WorkerLifecycleMachine } from './WorkerLifecycleMachine.js';

interface WorkerRecordInterface<TWorker> {
  'lifecycleState': WorkerLifecycleStateInterface;
  readonly 'observation': WorkerObservationInterface;
  readonly 'worker': TWorker;
}

class WorkerLeaseCoordinator<TWorker> {
  readonly #available: WorkerRecordInterface<TWorker>[] = [];
  readonly #factory: WorkerFactoryInterface<TWorker>;
  readonly #lifecycleMachine = new WorkerLifecycleMachine();
  readonly #records = new Map<TWorker, WorkerRecordInterface<TWorker>>();
  #closed = false;

  public constructor(factory: WorkerFactoryInterface<TWorker>) {
    this.#factory = factory;
  }

  public async acquire(): Promise<WorkerRecordInterface<TWorker>> {
    if (this.#closed) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.closed',
        'message': 'WorkerLeasePool is closed'
      });
    }
    let record = this.#available.pop();
    while (record !== undefined && !record.observation.isAlive()) {
      await WorkerLeaseCoordinator.#evict(record, this.#available, this.#factory, this.#lifecycleMachine, this.#records);
      record = this.#available.pop();
    }
    const acquired = record ?? await this.#createRecord();
    if (this.#closed) {
      await WorkerLeaseCoordinator.#evict(acquired, this.#available, this.#factory, this.#lifecycleMachine, this.#records);
      throw new WorkerPoolError({
        'code': 'workerLeasePool.closed',
        'message': 'WorkerLeasePool is closed'
      });
    }
    acquired.lifecycleState = this.#lifecycleMachine.transition(acquired.lifecycleState, { 'type': 'assign' }).state;
    return acquired;
  }

  public async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    const records = Array.from(this.#records.values());
    const errors = await WorkerLeaseCoordinator.#evictRecords(
      records,
      this.#available,
      this.#factory,
      this.#lifecycleMachine,
      this.#records
    );
    if (errors.length > 0) {
      throw new WorkerPoolError({
        'cause': errors[0],
        'code': 'workerLeasePool.closeFailed',
        'message': 'WorkerLeasePool close failed'
      });
    }
  }

  public isAlive(record: WorkerRecordInterface<TWorker>): boolean {
    const result = this.#records.get(record.worker) === record && record.observation.isAlive();
    return result;
  }

  public async release(record: WorkerRecordInterface<TWorker>): Promise<void> {
    if (this.#records.get(record.worker) !== record) {
      return;
    }
    if (this.#closed || !record.observation.isAlive()) {
      await WorkerLeaseCoordinator.#evict(record, this.#available, this.#factory, this.#lifecycleMachine, this.#records);
      return;
    }
    record.lifecycleState = this.#lifecycleMachine.transition(record.lifecycleState, { 'type': 'free' }).state;
    this.#available.push(record);
  }

  public async terminate(record: WorkerRecordInterface<TWorker>): Promise<void> {
    await WorkerLeaseCoordinator.#evict(record, this.#available, this.#factory, this.#lifecycleMachine, this.#records);
  }

  static async #evictRecords<TWorker>(
    records: readonly WorkerRecordInterface<TWorker>[],
    available: WorkerRecordInterface<TWorker>[],
    factory: WorkerFactoryInterface<TWorker>,
    lifecycleMachine: WorkerLifecycleMachine,
    trackedRecords: Map<TWorker, WorkerRecordInterface<TWorker>>
  ): Promise<unknown[]> {
    const errors: unknown[] = [];
    for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
      const record = records[recordIndex];
      if (record === undefined) {
        continue;
      }
      const error = await WorkerLeaseCoordinator.#tryEvict(record, available, factory, lifecycleMachine, trackedRecords);
      if (error !== undefined) {
        errors.push(error);
      }
    }
    return errors;
  }

  static async #tryEvict<TWorker>(
    record: WorkerRecordInterface<TWorker>,
    available: WorkerRecordInterface<TWorker>[],
    factory: WorkerFactoryInterface<TWorker>,
    lifecycleMachine: WorkerLifecycleMachine,
    trackedRecords: Map<TWorker, WorkerRecordInterface<TWorker>>
  ): Promise<unknown> {
    try {
      await WorkerLeaseCoordinator.#evict(record, available, factory, lifecycleMachine, trackedRecords);
      return undefined;
    } catch (error) {
      return error;
    }
  }

  async #createRecord(): Promise<WorkerRecordInterface<TWorker>> {
    let worker: TWorker;
    try {
      worker = await this.#factory.create();
    } catch (cause) {
      throw new WorkerPoolError({
        'cause': cause,
        'code': 'workerLeasePool.createFailed',
        'message': 'WorkerLeasePool factory create failed'
      });
    }
    try {
      await this.#factory.initialize(worker);
      const observation = this.#factory.observe(worker);
      const result: WorkerRecordInterface<TWorker> = {
        'lifecycleState': this.#lifecycleMachine.getInitialState(),
        'observation': observation,
        'worker': worker
      };
      this.#records.set(worker, result);
      return result;
    } catch (cause) {
      try {
        await this.#factory.terminate(worker);
      } catch (terminationCause) {
        throw new WorkerPoolError({
          'cause': terminationCause,
          'code': 'workerLeasePool.initializationCleanupFailed',
          'message': 'WorkerLeasePool cleanup failed after initialization failure'
        });
      }
      throw new WorkerPoolError({
        'cause': cause,
        'code': 'workerLeasePool.initializationFailed',
        'message': 'WorkerLeasePool factory initialization failed'
      });
    }
  }

  static async #evict<TWorker>(
    record: WorkerRecordInterface<TWorker>,
    available: WorkerRecordInterface<TWorker>[],
    factory: WorkerFactoryInterface<TWorker>,
    lifecycleMachine: WorkerLifecycleMachine,
    trackedRecords: Map<TWorker, WorkerRecordInterface<TWorker>>
  ): Promise<void> {
    if (trackedRecords.get(record.worker) !== record) {
      return;
    }
    trackedRecords.delete(record.worker);
    const availableIndex = available.indexOf(record);
    if (availableIndex >= 0) {
      available.splice(availableIndex, 1);
    }
    record.lifecycleState = lifecycleMachine.transition(record.lifecycleState, { 'type': 'kill' }).state;
    let terminationError: WorkerPoolError | undefined;
    try {
      await factory.terminate(record.worker);
    } catch (cause) {
      terminationError = new WorkerPoolError({
        'cause': cause,
        'code': 'workerLeasePool.terminationFailed',
        'message': 'WorkerLeasePool factory termination failed'
      });
    }
    try {
      record.observation.close();
    } catch (cause) {
      throw new WorkerPoolError({
        'cause': cause,
        'code': 'workerLeasePool.observationCloseFailed',
        'message': 'WorkerLeasePool observation cleanup failed'
      });
    }
    if (terminationError !== undefined) {
      throw terminationError;
    }
  }
}

class WorkerLease<TWorker> implements WorkerLeaseInterface<TWorker> {
  readonly #coordinator: WorkerLeaseCoordinator<TWorker>;
  readonly #onRelease: () => void;
  readonly #record: WorkerRecordInterface<TWorker>;
  readonly #releasePermit: () => Promise<void>;
  #released = false;
  public readonly worker: TWorker;

  public constructor(
    record: WorkerRecordInterface<TWorker>,
    coordinator: WorkerLeaseCoordinator<TWorker>,
    releasePermit: () => Promise<void>,
    onRelease: () => void
  ) {
    this.#coordinator = coordinator;
    this.#onRelease = onRelease;
    this.#record = record;
    this.#releasePermit = releasePermit;
    this.worker = record.worker;
  }

  public isAlive(): boolean {
    const result = !this.#released && this.#coordinator.isAlive(this.#record);
    return result;
  }

  public async request<TRequest, TResponse>(
    transport: WorkerTransportInterface<TWorker, TRequest, TResponse>,
    request: TRequest
  ): Promise<TResponse> {
    if (!this.isAlive()) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.leaseNotAlive',
        'message': 'Worker lease is not alive'
      });
    }
    if (!Predicates.isObject(transport) || !Predicates.isFunction(transport.request)) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.invalidTransport',
        'message': 'Worker lease transport must provide request()'
      });
    }
    return await transport.request(this.worker, request);
  }

  public async release(): Promise<void> {
    if (this.#released) {
      return;
    }
    this.#released = true;
    try {
      await this.#coordinator.release(this.#record);
    } finally {
      this.#onRelease();
      await this.#releasePermit();
    }
  }

  public async terminate(): Promise<void> {
    if (this.#released) {
      return;
    }
    this.#released = true;
    try {
      await this.#coordinator.terminate(this.#record);
    } finally {
      this.#onRelease();
      await this.#releasePermit();
    }
  }
}

export class WorkerLeasePool<TWorker> {
  readonly #coordinator: WorkerLeaseCoordinator<TWorker>;
  readonly #leasePermitReleases = new Set<() => Promise<void>>();
  readonly #pendingAcquisitions = new Set<Promise<void>>();
  readonly #semaphore: Semaphore;
  #closed = false;

  private constructor(options: WorkerLeasePoolOptionsInterface<TWorker>) {
    this.#coordinator = new WorkerLeaseCoordinator(options.factory);
    this.#semaphore = Semaphore.create({ 'permits': options.maximumLeases });
  }

  public static create<TWorker>(options: WorkerLeasePoolOptionsInterface<TWorker>): WorkerLeasePool<TWorker> {
    if (!Predicates.isPositiveInteger(options.maximumLeases)) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.invalidMaximumLeases',
        'message': 'WorkerLeasePool maximumLeases must be a positive integer'
      });
    }
    if (
      !Predicates.isObject(options.factory)
      || !Predicates.isFunction(options.factory.create)
      || !Predicates.isFunction(options.factory.initialize)
      || !Predicates.isFunction(options.factory.observe)
      || !Predicates.isFunction(options.factory.terminate)
    ) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.invalidFactory',
        'message': 'WorkerLeasePool factory must provide create(), initialize(), observe(), and terminate()'
      });
    }
    return new WorkerLeasePool(options);
  }

  public async acquire(): Promise<WorkerLeaseInterface<TWorker>> {
    if (this.#closed) {
      throw new WorkerPoolError({
        'code': 'workerLeasePool.closed',
        'message': 'WorkerLeasePool is closed'
      });
    }
    const acquisition = Promise.withResolvers<void>();
    this.#pendingAcquisitions.add(acquisition.promise);
    let acquisitionSettled = false;
    const settleAcquisition = (): void => {
      if (acquisitionSettled) {
        return;
      }
      acquisitionSettled = true;
      this.#pendingAcquisitions.delete(acquisition.promise);
      acquisition.resolve();
    };
    let releasePermit: (() => Promise<void>) | undefined;
    try {
      const acquiredPermit = await this.#semaphore.acquire();
      releasePermit = acquiredPermit;
      if (this.#closed) {
        throw new WorkerPoolError({
          'code': 'workerLeasePool.closed',
          'message': 'WorkerLeasePool is closed'
        });
      }
      const record = await this.#coordinator.acquire();
      const onRelease = (): void => {
        this.#leasePermitReleases.delete(acquiredPermit);
      };
      this.#leasePermitReleases.add(acquiredPermit);
      return new WorkerLease(record, this.#coordinator, acquiredPermit, onRelease);
    } catch (error) {
      if (releasePermit !== undefined) {
        await releasePermit();
      }
      throw error;
    } finally {
      settleAcquisition();
    }
  }

  public async close(): Promise<void> {
    this.#closed = true;
    const coordinatorClose = Promise.allSettled([this.#coordinator.close()]);
    const leasePermitReleases = Array.from(this.#leasePermitReleases);
    const pendingAcquisitions = Array.from(this.#pendingAcquisitions);
    const releaseOutcomes = await Promise.allSettled(leasePermitReleases.map(async (releasePermit): Promise<void> => {
      await this.#releaseTrackedPermit(releasePermit);
    }));
    await Promise.all(pendingAcquisitions);
    const coordinatorOutcomes = await coordinatorClose;
    const coordinatorFailure = coordinatorOutcomes.at(0);
    if (coordinatorFailure?.status === 'rejected') {
      throw coordinatorFailure.reason;
    }
    const failedRelease = releaseOutcomes.find((outcome): outcome is PromiseRejectedResult => {
      const result = outcome.status === 'rejected';
      return result;
    });
    if (failedRelease !== undefined) {
      throw failedRelease.reason;
    }
  }

  async #releaseTrackedPermit(releasePermit: () => Promise<void>): Promise<void> {
    try {
      await releasePermit();
    } finally {
      this.#leasePermitReleases.delete(releasePermit);
    }
  }
}
