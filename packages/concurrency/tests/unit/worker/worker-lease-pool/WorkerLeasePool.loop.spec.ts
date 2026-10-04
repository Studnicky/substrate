import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  WorkerFactoryInterface,
  WorkerObservationInterface,
  WorkerTransportInterface
} from '../../../../src/worker/index.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { WorkerLeasePool } from '../../../../src/worker/index.js';
import { WorkerLeasePoolScenarioCaseEntity } from '../entities/WorkerLeasePoolScenarioCaseEntity.js';
import scenarioGroups from './WorkerLeasePool.scenarios.json' with { 'type': 'json' };

interface WorkerFixtureInterface {
  'alive': boolean;
  readonly 'id': string;
  'initialized': boolean;
}

class WorkerFixtureObservation implements WorkerObservationInterface {
  readonly #worker: WorkerFixtureInterface;
  public closed = false;

  public constructor(worker: WorkerFixtureInterface) {
    this.#worker = worker;
  }

  public close(): void {
    this.closed = true;
  }

  public isAlive(): boolean {
    const result = this.#worker.alive;
    return result;
  }
}

class CountingWorkerFactory implements WorkerFactoryInterface<WorkerFixtureInterface> {
  public calls = 0;
  public initializedWorkers = 0;
  public terminatedWorkers = 0;
  public readonly workers: WorkerFixtureInterface[] = [];

  public constructor(private readonly workerId: string) {}

  public create(): Promise<WorkerFixtureInterface> {
    this.calls += 1;
    const worker: WorkerFixtureInterface = {
      'alive': true,
      'id': `${this.workerId}-${this.calls}`,
      'initialized': false
    };
    this.workers.push(worker);
    const result = Promise.resolve(worker);
    return result;
  }

  public initialize(worker: WorkerFixtureInterface): Promise<void> {
    worker.initialized = true;
    this.initializedWorkers += 1;
    const result = Promise.resolve();
    return result;
  }

  public observe(worker: WorkerFixtureInterface): WorkerObservationInterface {
    const result = new WorkerFixtureObservation(worker);
    return result;
  }

  public terminate(worker: WorkerFixtureInterface): Promise<void> {
    worker.alive = false;
    this.terminatedWorkers += 1;
    const result = Promise.resolve();
    return result;
  }
}

class WorkerFixtureTransport implements WorkerTransportInterface<
  WorkerFixtureInterface,
  string,
  string
> {
  public request(worker: WorkerFixtureInterface, request: string): Promise<string> {
    const result = Promise.resolve(`${worker.id}:${request}`);
    return result;
  }
}

class DeferredWorkerFixtureTransport implements WorkerTransportInterface<
  WorkerFixtureInterface,
  string,
  string
> {
  readonly #response = Promise.withResolvers<string>();

  public request(_worker: WorkerFixtureInterface, _request: string): Promise<string> {
    const result = this.#response.promise;
    return result;
  }

  public resolve(response: string): void {
    this.#response.resolve(response);
  }
}

class DeferredInitializationWorkerFactory extends CountingWorkerFactory {
  readonly #initializationStarted = Promise.withResolvers<void>();
  readonly #releaseInitialization = Promise.withResolvers<void>();

  public override async initialize(worker: WorkerFixtureInterface): Promise<void> {
    this.#initializationStarted.resolve();
    await this.#releaseInitialization.promise;
    await super.initialize(worker);
  }

  public async releaseInitialization(): Promise<void> {
    this.#releaseInitialization.resolve();
    await Promise.resolve();
  }

  public async waitForInitialization(): Promise<void> {
    await this.#initializationStarted.promise;
  }
}

class DeferredTerminationWorkerFactory extends CountingWorkerFactory {
  readonly #releaseTermination = Promise.withResolvers<void>();
  readonly #terminationStarted = Promise.withResolvers<void>();

  public override async terminate(worker: WorkerFixtureInterface): Promise<void> {
    this.#terminationStarted.resolve();
    await this.#releaseTermination.promise;
    await super.terminate(worker);
  }

  public async releaseTermination(): Promise<void> {
    this.#releaseTermination.resolve();
    await Promise.resolve();
  }

  public async waitForTermination(): Promise<void> {
    await this.#terminationStarted.promise;
  }
}

class WorkerLeasePoolSupport {
  static requireNumber(value: number | undefined, name: string): number {
    if (value === undefined) {
      throw RuntimeError.create(`${name} is required`);
    }
    return value;
  }

  static requireString(value: string | undefined, name: string): string {
    if (value === undefined) {
      throw RuntimeError.create(`${name} is required`);
    }
    return value;
  }

  static requireBoolean(value: boolean | undefined, name: string): boolean {
    if (value === undefined) {
      throw RuntimeError.create(`${name} is required`);
    }
    return value;
  }
}

class WorkerLeasePoolRunners {
  static 'reuse-and-bound'(scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const first = await pool.acquire();
      const waiting = pool.acquire();
      await first.release();
      const second = await waiting;
      assert.equal(
        factory.calls,
        WorkerLeasePoolSupport.requireNumber(scenarioCase.expected.factoryCalls, 'factoryCalls')
      );
      assert.equal(
        first.worker === second.worker,
        WorkerLeasePoolSupport.requireBoolean(scenarioCase.expected.sameWorker, 'sameWorker')
      );
      await second.release();
      await pool.close();
    })();
    return result;
  }

  static 'initializes-before-leasing'(
    scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type
  ): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const lease = await pool.acquire();
      assert.equal(lease.worker.initialized, true);
      assert.equal(
        factory.initializedWorkers,
        WorkerLeasePoolSupport.requireNumber(
          scenarioCase.expected.initializedWorkers,
          'initializedWorkers'
        )
      );
      await lease.release();
      await pool.close();
    })();
    return result;
  }

  static 'evicts-dead-worker'(scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const first = await pool.acquire();
      first.worker.alive = false;
      assert.equal(first.isAlive(), false);
      await first.release();
      const second = await pool.acquire();
      assert.equal(
        factory.calls,
        WorkerLeasePoolSupport.requireNumber(scenarioCase.expected.factoryCalls, 'factoryCalls')
      );
      assert.equal(
        factory.terminatedWorkers,
        WorkerLeasePoolSupport.requireNumber(
          scenarioCase.expected.terminatedBeforeClose,
          'terminatedBeforeClose'
        )
      );
      await second.release();
      await pool.close();
    })();
    return result;
  }

  static 'delegates-generic-transport'(
    scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type
  ): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const lease = await pool.acquire();
      const response = await lease.request(
        new WorkerFixtureTransport(),
        WorkerLeasePoolSupport.requireString(scenarioCase.input.request, 'request')
      );
      assert.equal(
        response,
        WorkerLeasePoolSupport.requireString(scenarioCase.expected.response, 'response')
      );
      await lease.release();
      await pool.close();
    })();
    return result;
  }

  static 'close-terminates-active-lease'(
    scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type
  ): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const lease = await pool.acquire();
      await pool.close();
      assert.equal(lease.isAlive(), false);
      const terminatedWorkers = WorkerLeasePoolSupport.requireNumber(
        scenarioCase.expected.terminatedWorkers,
        'terminatedWorkers'
      );
      assert.equal(factory.terminatedWorkers, terminatedWorkers);
      await assert.rejects(pool.acquire(), (error: Error): boolean => {
        assert.equal(
          error.message,
          WorkerLeasePoolSupport.requireString(
            scenarioCase.expected.rejectedMessage,
            'rejectedMessage'
          )
        );
        return true;
      });
      await lease.release();
      assert.equal(factory.terminatedWorkers, terminatedWorkers);
    })();
    return result;
  }

  static 'close-during-request'(
    scenarioCase: WorkerLeasePoolScenarioCaseEntity.Type
  ): Promise<void> {
    const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
    const pool = WorkerLeasePool.create({
      'factory': factory,
      'maximumLeases': scenarioCase.input.maximumLeases
    });
    const result = (async (): Promise<void> => {
      const lease = await pool.acquire();
      const transport = new DeferredWorkerFixtureTransport();
      const request = lease.request(
        transport,
        WorkerLeasePoolSupport.requireString(scenarioCase.input.request, 'request')
      );
      await pool.close();
      assert.equal(lease.isAlive(), false);
      transport.resolve(
        WorkerLeasePoolSupport.requireString(scenarioCase.expected.response, 'response')
      );
      assert.equal(
        await request,
        WorkerLeasePoolSupport.requireString(scenarioCase.expected.response, 'response')
      );
      await lease.release();
    })();
    return result;
  }
}

class WorkerLeasePoolAdditionalRunners {
  static async rejectsQueuedAcquisitions(): Promise<void> {
    const factory = new CountingWorkerFactory('worker-a');
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const active = await pool.acquire();
    const firstQueued = pool.acquire();
    const secondQueued = pool.acquire();

    await pool.close();
    await Promise.all([
      assert.rejects(firstQueued, { 'message': 'WorkerLeasePool is closed' }),
      assert.rejects(secondQueued, { 'message': 'WorkerLeasePool is closed' })
    ]);
    await active.release();
  }

  static async sharesCloseCompletion(): Promise<void> {
    const factory = new DeferredTerminationWorkerFactory('worker-a');
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const lease = await pool.acquire();
    const firstClose = pool.close();

    await factory.waitForTermination();
    let secondCloseSettled = false;
    const secondClose = pool.close().then((): void => {
      secondCloseSettled = true;
    });

    await Promise.resolve();
    assert.equal(secondCloseSettled, false);
    await factory.releaseTermination();
    await Promise.all([firstClose, secondClose]);
    assert.equal(factory.terminatedWorkers, 1);
    await lease.release();
  }

  static async rejectsLateInitialization(): Promise<void> {
    const factory = new DeferredInitializationWorkerFactory('worker-a');
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const acquisition = pool.acquire();

    await factory.waitForInitialization();
    let closeSettled = false;
    const close = pool.close().then((): void => {
      closeSettled = true;
    });

    await Promise.resolve();
    assert.equal(closeSettled, false);
    await factory.releaseInitialization();
    await assert.rejects(acquisition, { 'message': 'WorkerLeasePool is closed' });
    await close;
    assert.equal(factory.terminatedWorkers, 1);
  }
}

ScenarioSuite.register({
  'entity': WorkerLeasePoolScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerLeasePool',
  'runners': WorkerLeasePoolRunners
});

void describe('WorkerLeasePool close', () => {
  void it(
    'rejects queued acquisitions on close without leaking returned permits',
    WorkerLeasePoolAdditionalRunners.rejectsQueuedAcquisitions
  );
  void it(
    'shares completion for concurrent close calls',
    WorkerLeasePoolAdditionalRunners.sharesCloseCompletion
  );
  void it(
    'rejects a lease whose initialization completes after close',
    WorkerLeasePoolAdditionalRunners.rejectsLateInitialization
  );
});
