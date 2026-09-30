import { EntityCompiler } from '@studnicky/entity/node';
import { Mutex } from '@studnicky/mutex/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BrowserStorageInterface } from '../../src/browser/index.js';
import type { StatePersistenceInterface } from '../../src/interfaces/index.js';
import type { MutableStateEntity } from './entities/MutableStateEntity.js';

import { BrowserPersistence, StorageTarget } from '../../src/browser/index.js';
import * as BrowserStoreModule from '../../src/browser/Store.js';
import { BrowserPersistenceOptionsEntity } from '../../src/entities/BrowserPersistenceOptionsEntity.js';
import { JsonStateCodec } from '../../src/JsonStateCodec.js';
import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store } from '../../src/node/Store.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import { IndexedDbUpgrade } from '../helpers/IndexedDbUpgrade.js';
import { RecordingGatedPersistence } from '../helpers/RecordingGatedPersistence.js';
import { StoreTestError } from '../helpers/StoreTestError.js';

import 'fake-indexeddb/auto';

class BrowserStorage implements BrowserStorageInterface {
  readonly #entries = new Map<string, string>();

  public getItem(key: string): string | null {
    const result = this.#entries.get(key) ?? null;

    return result;
  }

  public removeItem(key: string): void {
    this.#entries.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.#entries.set(key, value);
  }
}

class CollaboratorMutatingPersistence implements StatePersistenceInterface<MutableStateEntity.Type> {
  readonly #persisted: MutableStateEntity.Type;

  public constructor(persisted: MutableStateEntity.Type) {
    this.#persisted = persisted;
  }

  public async clear(): Promise<void> {
    await Promise.resolve();
  }

  public async load(): Promise<MutableStateEntity.Type> {
    const loaded = await Promise.resolve(this.#persisted);
    return loaded;
  }

  public async save(_key: string, state: MutableStateEntity.Type): Promise<void> {
    state.nested.count = 99;
    state.values.push('persistence');
    await Promise.resolve();
  }
}

interface BrowserPersistenceScenarioInterface {
  readonly 'createPersistence': () => StatePersistenceInterface<number>;
  readonly 'name': string;
}

interface CounterStateInterface {
  readonly 'count': number;
}

class StoreTests {
  static declaresGroup1(): void {
    void it('hydrates persisted state and awaits asynchronous subscribers', async () => {
      const persistence = MemoryPersistence.create<number>();
      const store = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });
      const notifications: number[] = [];

      store.subscribe(async (snapshot): Promise<void> => {
        await Promise.resolve();
        notifications.push(snapshot);
      });

      await store.setState(1);
      const hydrated = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

      await hydrated.hydrate();

      assert.deepEqual(notifications, [1]);
      assert.equal(hydrated.getSnapshot(), 1);
    });

    void it('serializes competing stores through an injected mutex and their shared state key', async () => {
      const persistence = new RecordingGatedPersistence();
      const mutex = Mutex.create<string>();
      const first = Store.create({ 'initialState': 0, 'key': 'counter', 'mutex': mutex, 'persistence': persistence });
      const second = Store.create({ 'initialState': 0, 'key': 'counter', 'mutex': mutex, 'persistence': persistence });

      const firstWrite = first.setState(1);
      await persistence.firstSaveStarted.promise;
      const secondWrite = second.setState(2);
      await Promise.resolve();

      assert.equal(persistence.saveCalls, 1);
      persistence.releaseFirstSave.resolve();
      await Promise.all([firstWrite, secondWrite]);

      assert.deepEqual(persistence.writes, [1, 2]);
      assert.equal(await persistence.backing.load('counter'), 2);
      assert.equal(first.getSnapshot(), 1);
      assert.equal(second.getSnapshot(), 2);
    });

    void it('rejects malformed persisted state through the entity intake boundary', async () => {
      const storage = new BrowserStorage();
      storage.setItem('counter', '{"count":"invalid"}');
      const persistence = BrowserPersistence.create({
        'codec': JsonStateCodec.fromEntity(StoreTests.COUNTER_STATE_INTAKE),
        'storage': storage,
        'storageTarget': StorageTarget.LocalStorage
      });

      await ErrorCapture.rejectionMessage(persistence.load('counter'), 'must be number');
    });

    void it('rejects unsupported root state serialization without creating persisted state', async () => {
      const persistence = BrowserPersistence.create({ 'codec': StoreTests.UNKNOWN_CODEC, 'storageTarget': StorageTarget.Memory });

      const unsupportedStates = StoreTests.UNSUPPORTED_ROOT_STATE_VALUES;
      for (let index = 0; index < unsupportedStates.length; index += 1) {
        await ErrorCapture.rejectionMessage(persistence.save('unsupported-root', unsupportedStates[index]), 'JSON state serialization must produce a string');
      }

      assert.equal(await persistence.load('unsupported-root'), undefined);
    });

    void it('rejects invalid entity state before persistence', async () => {
      const storage = new BrowserStorage();
      const persistence = BrowserPersistence.create({
        'codec': JsonStateCodec.fromEntity(StoreTests.COUNTER_STATE_INTAKE),
        'storage': storage,
        'storageTarget': StorageTarget.LocalStorage
      });
      const invalidState: unknown = { 'count': 'invalid' };

      ErrorCapture.thrownMessage(() => { StoreTests.COUNTER_STATE_INTAKE(invalidState); }, 'must be number');
      assert.equal(storage.getItem('counter'), null);
      assert.equal(await persistence.load('counter'), undefined);
    });
  }

  static declaresGroup2(): void {
    void it('uses browser memory persistence through the same store interface', async () => {
      const persistence = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storageTarget': StorageTarget.Memory });
      const store = BrowserStoreModule.Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

      await store.update((snapshot): number => {
        const result = snapshot + 2;
        return result;
      });

      const hydrated = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

      await hydrated.hydrate();

      assert.equal(store.getSnapshot(), 2);
      assert.equal(hydrated.getSnapshot(), 2);
    });

    void it('rejects Store mutations requested from a Store listener', async () => {
      const store = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': MemoryPersistence.create<number>() });

      store.subscribe(async (): Promise<void> => {
        await ErrorCapture.rejectionMessage(store.update((snapshot): number => {
          const result = snapshot + 1;
          return result;
        }), 'not allowed from a Store listener');
      });

      await store.setState(1);

      assert.equal(store.getSnapshot(), 1);
    });

    void it('rejects an invalid browser persistence storage selection at construction', () => {
      const rawOptions: Record<string, unknown> = {
        'codec': StoreTests.NUMBER_CODEC,
        'storageTarget': 'invalid'
      };

      assert.strictEqual(BrowserPersistenceOptionsEntity.validate(rawOptions), false);
    });

    void it('releases an IndexedDB connection when another context upgrades its schema', async () => {
      const persistence = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb });
      await persistence.save('upgrade-check', 1);
      await IndexedDbUpgrade.upgrade('substrate-store', 2);

      await persistence.save('upgrade-check', 2);

      assert.equal(await persistence.load('upgrade-check'), 2);
    });

    const scenariosCount = StoreTests.BROWSER_PERSISTENCE_SCENARIOS.length;

    for (let index = 0; index < scenariosCount; index += 1) {
      const scenario = StoreTests.BROWSER_PERSISTENCE_SCENARIOS[index];

      if (scenario === undefined) {
        continue;
      }

      void it(`${scenario.name} satisfies the persistence contract`, async () => {
        await StoreTests.verifyPersistenceContract(scenario);
      });
    }
  }

  static declaresGroup3(): void {
    void it('owns mutable state across construction, mutation, snapshots, and persistence', async () => {
      const initialState: MutableStateEntity.Type = { 'nested': { 'count': 1 }, 'values': ['initial'] };
      const persistence = MemoryPersistence.create<MutableStateEntity.Type>();
      const store = Store.create({ 'initialState': initialState, 'key': 'ownership', 'persistence': persistence });

      initialState.nested.count = 9;
      initialState.values.push('caller');

      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 1 }, 'values': ['initial'] });

      const suppliedState: MutableStateEntity.Type = { 'nested': { 'count': 2 }, 'values': ['supplied'] };
      await store.setState(suppliedState);
      suppliedState.nested.count = 7;
      suppliedState.values.push('caller');

      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 2 }, 'values': ['supplied'] });

      await store.update((snapshot): MutableStateEntity.Type => {
        assert.throws((): void => {
          snapshot.nested.count = 11;
        });
        assert.throws((): void => {
          snapshot.values.push('updater');
        });

        return { 'nested': { 'count': snapshot.nested.count + 1 }, 'values': [...snapshot.values, 'updated'] };
      });

      const snapshot = store.getSnapshot();
      assert.throws((): void => {
        snapshot.nested.count = 12;
      });
      assert.throws((): void => {
        snapshot.values.push('snapshot');
      });
      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 3 }, 'values': ['supplied', 'updated'] });

      const persisted = await persistence.load('ownership');
      assert.notEqual(persisted, undefined);
      if (persisted === undefined) {
        throw new StoreTestError('Expected persisted state');
      }
      persisted.nested.count = 13;
      persisted.values.push('loaded');

      assert.deepEqual(await persistence.load('ownership'), { 'nested': { 'count': 3 }, 'values': ['supplied', 'updated'] });
    });

    void it('detaches Store persistence ingress and egress from collaborator mutations', async () => {
      const persisted: MutableStateEntity.Type = { 'nested': { 'count': 5 }, 'values': ['persisted'] };
      const persistence = new CollaboratorMutatingPersistence(persisted);
      const store = Store.create({
        'initialState': { 'nested': { 'count': 0 }, 'values': [] },
        'key': 'collaborator-ownership',
        'persistence': persistence
      });

      await store.hydrate();
      persisted.nested.count = 15;
      persisted.values.push('later');

      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 5 }, 'values': ['persisted'] });

      await store.setState({ 'nested': { 'count': 6 }, 'values': ['supplied'] });

      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 6 }, 'values': ['supplied'] });
    });

    void it('keeps MemoryPersistence save values detached from callers', async () => {
      const persistence = MemoryPersistence.create<MutableStateEntity.Type>();
      const state: MutableStateEntity.Type = { 'nested': { 'count': 4 }, 'values': ['saved'] };

      await persistence.save('memory-ownership', state);
      state.nested.count = 14;
      state.values.push('caller');

      assert.deepEqual(await persistence.load('memory-ownership'), { 'nested': { 'count': 4 }, 'values': ['saved'] });
    });
  }

  private static async verifyPersistenceContract(scenario: BrowserPersistenceScenarioInterface): Promise<void> {
    const persistence = scenario.createPersistence();
    const key = `persistence-contract:${scenario.name}`;

    assert.equal(await persistence.load(key), undefined);
    await persistence.save(key, 7);
    assert.equal(await persistence.load(key), 7);
    await persistence.clear(key);
    assert.equal(await persistence.load(key), undefined);
  }

  private static readonly COUNTER_STATE_INTAKE = EntityCompiler.compileIntake<CounterStateInterface>({
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' }
    },
    'required': ['count'],
    'type': 'object'
  });

  private static readonly NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
    if (typeof value !== 'number') {
      throw new StoreTestError('Expected a number');
    }

    return value;
  } });

  private static readonly UNKNOWN_CODEC = JsonStateCodec.create<unknown>({ 'decode': (value: unknown): unknown => {return value;} });

  private static readonly UNSUPPORTED_ROOT_STATE_VALUES: readonly unknown[] = [
    undefined,
    Object.is,
    Symbol('state')
  ];

  private static readonly BROWSER_PERSISTENCE_SCENARIOS: readonly BrowserPersistenceScenarioInterface[] = [
    {
      'createPersistence': (): StatePersistenceInterface<number> => {
        const result = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storageTarget': StorageTarget.Memory });
        return result;
      },
      'name': 'browser memory'
    },
    {
      'createPersistence': (): StatePersistenceInterface<number> => {
        const result = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storage': new BrowserStorage(), 'storageTarget': StorageTarget.LocalStorage });
        return result;
      },
      'name': 'local storage'
    },
    {
      'createPersistence': (): StatePersistenceInterface<number> => {
        const result = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storage': new BrowserStorage(), 'storageTarget': StorageTarget.SessionStorage });
        return result;
      },
      'name': 'session storage'
    },
    {
      'createPersistence': (): StatePersistenceInterface<number> => {
        const result = BrowserPersistence.create({ 'codec': StoreTests.NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb });
        return result;
      },
      'name': 'IndexedDB'
    }
  ];
}

void describe('Store', () => {
  StoreTests.declaresGroup1();
  StoreTests.declaresGroup2();
  StoreTests.declaresGroup3();
});
