import { RuntimeError, BaseError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';


import { Predicates } from '@studnicky/types';

import type { WorkerFactoryInterface, WorkerObservationInterface, WorkerTransportInterface } from '../../../src/index.js';
import { WorkerLeasePool } from '../../../src/index.js';
import scenarioGroups from './WorkerLeasePool.scenarios.json' with { type: 'json' };

interface WorkerFixtureInterface {
  'alive': boolean;
  readonly 'id': string;
  'initialized': boolean;
}

type CloseScenarioCase = {
  readonly 'expected': { readonly 'rejectedMessage': string; readonly 'terminatedWorkers': number };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'close-terminates-active-lease';
};

type CloseDuringRequestScenarioCase = {
  readonly 'expected': { readonly 'response': string };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'request': string; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'close-during-request';
};

type DeadWorkerScenarioCase = {
  readonly 'expected': { readonly 'factoryCalls': number; readonly 'terminatedBeforeClose': number };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'evicts-dead-worker';
};

type InitializationScenarioCase = {
  readonly 'expected': { readonly 'initializedWorkers': number };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'initializes-before-leasing';
};

type ReuseScenarioCase = {
  readonly 'expected': { readonly 'factoryCalls': number; readonly 'sameWorker': boolean };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'reuse-and-bound';
};

type TransportScenarioCase = {
  readonly 'expected': { readonly 'response': string };
  readonly 'input': { readonly 'maximumLeases': number; readonly 'request': string; readonly 'workerId': string };
  readonly 'name': string;
  readonly 'shape': 'delegates-generic-transport';
};

type ScenarioCase = CloseDuringRequestScenarioCase | CloseScenarioCase | DeadWorkerScenarioCase | InitializationScenarioCase | ReuseScenarioCase | TransportScenarioCase;

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
    return this.#worker.alive;
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
    const result: WorkerFixtureInterface = { 'alive': true, 'id': `${this.workerId}-${this.calls}`, 'initialized': false };
    this.workers.push(result);
    return Promise.resolve(result);
  }

  public initialize(worker: WorkerFixtureInterface): Promise<void> {
    worker.initialized = true;
    this.initializedWorkers += 1;
    return Promise.resolve();
  }

  public observe(worker: WorkerFixtureInterface): WorkerObservationInterface {
    return new WorkerFixtureObservation(worker);
  }

  public terminate(worker: WorkerFixtureInterface): Promise<void> {
    worker.alive = false;
    this.terminatedWorkers += 1;
    return Promise.resolve();
  }
}

class WorkerFixtureTransport implements WorkerTransportInterface<WorkerFixtureInterface, string, string> {
  public request(worker: WorkerFixtureInterface, request: string): Promise<string> {
    return Promise.resolve(`${worker.id}:${request}`);
  }
}

class DeferredWorkerFixtureTransport implements WorkerTransportInterface<WorkerFixtureInterface, string, string> {
  readonly #response = Promise.withResolvers<string>();

  public request(_worker: WorkerFixtureInterface, _request: string): Promise<string> {
    return this.#response.promise;
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

function requireBoolean(value: unknown, name: string): boolean {
  if (!Predicates.isBoolean(value)) { throw RuntimeError.create(`${name} must be a boolean`); }
  return value;
}

function requirePositiveInteger(value: unknown, name: string): number {
  if (!Predicates.isPositiveInteger(value)) { throw RuntimeError.create(`${name} must be a positive integer`); }
  return value;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) { throw RuntimeError.create(`${name} must be an object`); }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) { throw RuntimeError.create(`${name} must be a string`); }
  return value;
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const name = requireString(record['name'], 'scenario name');
  const shape = requireString(record['shape'], 'scenario shape');
  const normalizedInput = {
    'maximumLeases': requirePositiveInteger(input['maximumLeases'], 'scenario input maximumLeases'),
    'workerId': requireString(input['workerId'], 'scenario input workerId')
  };

  if (shape === 'reuse-and-bound') {
    return {
      'expected': {
        'factoryCalls': requirePositiveInteger(expected['factoryCalls'], 'scenario expected factoryCalls'),
        'sameWorker': requireBoolean(expected['sameWorker'], 'scenario expected sameWorker')
      },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }
  if (shape === 'initializes-before-leasing') {
    return {
      'expected': { 'initializedWorkers': requirePositiveInteger(expected['initializedWorkers'], 'scenario expected initializedWorkers') },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }
  if (shape === 'evicts-dead-worker') {
    return {
      'expected': {
        'factoryCalls': requirePositiveInteger(expected['factoryCalls'], 'scenario expected factoryCalls'),
        'terminatedBeforeClose': requirePositiveInteger(expected['terminatedBeforeClose'], 'scenario expected terminatedBeforeClose')
      },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }
  if (shape === 'delegates-generic-transport') {
    return {
      'expected': { 'response': requireString(expected['response'], 'scenario expected response') },
      'input': { ...normalizedInput, 'request': requireString(input['request'], 'scenario input request') },
      'name': name,
      'shape': shape
    };
  }
  if (shape === 'close-terminates-active-lease') {
    return {
      'expected': {
        'rejectedMessage': requireString(expected['rejectedMessage'], 'scenario expected rejectedMessage'),
        'terminatedWorkers': requirePositiveInteger(expected['terminatedWorkers'], 'scenario expected terminatedWorkers')
      },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }
  if (shape === 'close-during-request') {
    return {
      'expected': { 'response': requireString(expected['response'], 'scenario expected response') },
      'input': { ...normalizedInput, 'request': requireString(input['request'], 'scenario input request') },
      'name': name,
      'shape': shape
    };
  }
  throw RuntimeError.create(`Unknown worker lease scenario shape: ${shape}`);
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  const record = requireRecord(value, 'scenario groups');
  const cases = record['cases'];
  if (!Predicates.isArray(cases)) { throw RuntimeError.create('scenario groups cases must be an array'); }
  const result: ScenarioCase[] = [];
  for (const scenarioCase of cases) { result.push(parseScenarioCase(scenarioCase)); }
  return result;
}

const scenarioCases = parseScenarioCases(scenarioGroups);

void describe('WorkerLeasePool', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      const factory = new CountingWorkerFactory(scenarioCase.input.workerId);
      const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': scenarioCase.input.maximumLeases });
      switch (scenarioCase.shape) {
        case 'reuse-and-bound': {
          const first = await pool.acquire();
          const waiting = pool.acquire();
          await first.release();
          const second = await waiting;
          assert.equal(factory.calls, scenarioCase.expected.factoryCalls);
          assert.equal(first.worker === second.worker, scenarioCase.expected.sameWorker);
          await second.release();
          await pool.close();
          return;
        }
        case 'initializes-before-leasing': {
          const lease = await pool.acquire();
          assert.equal(lease.worker.initialized, true);
          assert.equal(factory.initializedWorkers, scenarioCase.expected.initializedWorkers);
          await lease.release();
          await pool.close();
          return;
        }
        case 'evicts-dead-worker': {
          const first = await pool.acquire();
          first.worker.alive = false;
          assert.equal(first.isAlive(), false);
          await first.release();
          const second = await pool.acquire();
          assert.equal(factory.calls, scenarioCase.expected.factoryCalls);
          assert.equal(factory.terminatedWorkers, scenarioCase.expected.terminatedBeforeClose);
          await second.release();
          await pool.close();
          return;
        }
        case 'delegates-generic-transport': {
          const lease = await pool.acquire();
          const response = await lease.request(new WorkerFixtureTransport(), scenarioCase.input.request);
          assert.equal(response, scenarioCase.expected.response);
          await lease.release();
          await pool.close();
          return;
        }
        case 'close-terminates-active-lease': {
          const lease = await pool.acquire();
          await pool.close();
          assert.equal(lease.isAlive(), false);
          assert.equal(factory.terminatedWorkers, scenarioCase.expected.terminatedWorkers);
          await assert.rejects(pool.acquire(), (error: unknown): boolean => {
            assert.equal(error instanceof BaseError, true);
            assert.equal(error instanceof Error && error.message, scenarioCase.expected.rejectedMessage);
            return true;
          });
          await lease.release();
          return;
        }
        case 'close-during-request': {
          const lease = await pool.acquire();
          const transport = new DeferredWorkerFixtureTransport();
          const request = lease.request(transport, scenarioCase.input.request);
          await pool.close();
          assert.equal(lease.isAlive(), false);
          transport.resolve(scenarioCase.expected.response);
          assert.equal(await request, scenarioCase.expected.response);
          await lease.release();
          return;
        }
      }
    });
  }

  void it('rejects a queued acquisition when the pool closes', async () => {
    const factory = new CountingWorkerFactory('worker-a');
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const active = await pool.acquire();
    const queued = pool.acquire();

    await pool.close();

    await assert.rejects(queued, /WorkerLeasePool is closed/u);
    await active.release();
  });

  void it('rejects a lease whose initialization completes after close', async () => {
    const factory = new DeferredInitializationWorkerFactory('worker-a');
    const pool = WorkerLeasePool.create({ 'factory': factory, 'maximumLeases': 1 });
    const acquisition = pool.acquire();

    await factory.waitForInitialization();
    await pool.close();
    await factory.releaseInitialization();

    await assert.rejects(acquisition, /WorkerLeasePool is closed/u);
    assert.equal(factory.terminatedWorkers, 1);
  });
});
