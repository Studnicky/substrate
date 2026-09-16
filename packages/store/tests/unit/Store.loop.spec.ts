import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { EntityCompiler } from '@studnicky/entity/node';
import { Mutex } from '@studnicky/mutex/node';
import 'fake-indexeddb/auto';

import {
  BrowserPersistence, StorageTarget
} from '../../src/browser/index.js';
import type { BrowserStorageInterface } from '../../src/browser/index.js';
import { JsonStateCodec } from '../../src/JsonStateCodec.js';
import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store as BrowserStore } from '../../src/browser/Store.js';
import { Store } from '../../src/node/Store.js';
import type { StatePersistenceInterface } from '../../src/interfaces/index.js';

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

interface BrowserPersistenceScenarioInterface {
  readonly 'createPersistence': () => StatePersistenceInterface<number>;
  readonly 'name': string;
}

interface CounterStateInterface {
  readonly 'count': number;
}

interface MutableStateInterface {
  'nested': { 'count': number };
  'values': string[];
}

const COUNTER_STATE_INTAKE = EntityCompiler.compileIntake<CounterStateInterface>({
  'additionalProperties': false,
  'properties': {
    'count': { 'type': 'number' }
  },
  'required': ['count'],
  'type': 'object'
});

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

const UNKNOWN_CODEC = JsonStateCodec.create<unknown>({ 'decode': (value: unknown): unknown => value });

const UNSUPPORTED_ROOT_STATE_VALUES: readonly unknown[] = [
  undefined,
  (): void => undefined,
  Symbol('state')
];

const BROWSER_PERSISTENCE_SCENARIOS: readonly BrowserPersistenceScenarioInterface[] = [
  {
    'createPersistence': (): StatePersistenceInterface<number> => BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.Memory }),
    'name': 'browser memory'
  },
  {
    'createPersistence': (): StatePersistenceInterface<number> => BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new BrowserStorage(), 'storageTarget': StorageTarget.LocalStorage }),
    'name': 'local storage'
  },
  {
    'createPersistence': (): StatePersistenceInterface<number> => BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new BrowserStorage(), 'storageTarget': StorageTarget.SessionStorage }),
    'name': 'session storage'
  },
  {
    'createPersistence': (): StatePersistenceInterface<number> => BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb }),
    'name': 'IndexedDB'
  }
];

void describe('Store', () => {
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
    const backing = MemoryPersistence.create<number>();
    const firstSaveStarted = Promise.withResolvers<void>();
    const releaseFirstSave = Promise.withResolvers<void>();
    const writes: number[] = [];
    let saveCalls = 0;
    const persistence: StatePersistenceInterface<number> = {
      'clear': async (key: string): Promise<void> => backing.clear(key),
      'load': async (key: string): Promise<number | undefined> => backing.load(key),
      'save': async (key: string, state: number): Promise<void> => {
        saveCalls += 1;
        if (saveCalls === 1) {
          firstSaveStarted.resolve();
          await releaseFirstSave.promise;
        }
        writes.push(state);
        await backing.save(key, state);
      }
    };
    const mutex = Mutex.create<string>();
    const first = Store.create({ 'initialState': 0, 'key': 'counter', 'mutex': mutex, 'persistence': persistence });
    const second = Store.create({ 'initialState': 0, 'key': 'counter', 'mutex': mutex, 'persistence': persistence });

    const firstWrite = first.setState(1);
    await firstSaveStarted.promise;
    const secondWrite = second.setState(2);
    await Promise.resolve();

    assert.equal(saveCalls, 1);
    releaseFirstSave.resolve();
    await Promise.all([firstWrite, secondWrite]);

    assert.deepEqual(writes, [1, 2]);
    assert.equal(await backing.load('counter'), 2);
    assert.equal(first.getSnapshot(), 1);
    assert.equal(second.getSnapshot(), 2);
  });

  void it('rejects malformed persisted state through the entity intake boundary', async () => {
    const storage = new BrowserStorage();
    storage.setItem('counter', JSON.stringify({ 'count': 'invalid' }));
    const persistence = BrowserPersistence.create({
      'codec': JsonStateCodec.fromEntity(COUNTER_STATE_INTAKE),
      storage,
      'storageTarget': StorageTarget.LocalStorage
    });

    await assert.rejects(persistence.load('counter'), /must be number/u);
  });

  void it('rejects unsupported root state serialization without creating persisted state', async () => {
    const persistence = BrowserPersistence.create({ 'codec': UNKNOWN_CODEC, 'storageTarget': StorageTarget.Memory });

    for (const state of UNSUPPORTED_ROOT_STATE_VALUES) {
      await assert.rejects(persistence.save('unsupported-root', state), /JSON state serialization must produce a string/u);
    }

    assert.equal(await persistence.load('unsupported-root'), undefined);
  });

  void it('rejects invalid entity state before persistence', async () => {
    const storage = new BrowserStorage();
    const persistence = BrowserPersistence.create({
      'codec': JsonStateCodec.fromEntity(COUNTER_STATE_INTAKE),
      storage,
      'storageTarget': StorageTarget.LocalStorage
    });
    const invalidState: unknown = { 'count': 'invalid' };

    await assert.rejects(Reflect.apply(persistence.save, persistence, ['counter', invalidState]), /must be number/u);
    assert.equal(storage.getItem('counter'), null);
    assert.equal(await persistence.load('counter'), undefined);
  });

  void it('uses browser memory persistence through the same store interface', async () => {
    const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.Memory });
    const store = BrowserStore.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

    await store.update((snapshot): number => {
      return snapshot + 2;
    });

    const hydrated = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

    await hydrated.hydrate();

    assert.equal(store.getSnapshot(), 2);
    assert.equal(hydrated.getSnapshot(), 2);
  });

  void it('rejects Store mutations requested from a Store listener', async () => {
    const store = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': MemoryPersistence.create<number>() });

    store.subscribe(async (): Promise<void> => {
      await assert.rejects(store.update((snapshot): number => snapshot + 1), /not allowed from a Store listener/u);
    });

    await store.setState(1);

    assert.equal(store.getSnapshot(), 1);
  });

  void it('rejects an invalid browser persistence storage selection at construction', () => {
    const rawOptions: Record<string, unknown> = {
      'codec': NUMBER_CODEC,
      'storageTarget': 'invalid'
    };

    assert.throws(() => {
      Reflect.apply(BrowserPersistence.create, BrowserPersistence, [rawOptions]);
    });
  });

  void it('releases an IndexedDB connection when another context upgrades its schema', async () => {
    const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb });
    await persistence.save('upgrade-check', 1);
    const request = indexedDB.open('substrate-store', 2);

    await new Promise<void>((resolve, reject): void => {
      request.addEventListener('blocked', (): void => {
        reject(new Error('IndexedDB upgrade remained blocked'));
      }, { 'once': true });
      request.addEventListener('error', (): void => {
        reject(request.error ?? new Error('IndexedDB upgrade failed'));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        request.result.close();
        resolve();
      }, { 'once': true });
    });

    await persistence.save('upgrade-check', 2);

    assert.equal(await persistence.load('upgrade-check'), 2);
  });

  const scenariosCount = BROWSER_PERSISTENCE_SCENARIOS.length;

  for (let index = 0; index < scenariosCount; index += 1) {
    const scenario = BROWSER_PERSISTENCE_SCENARIOS[index];

    if (scenario === undefined) {
      continue;
    }

    void it(`${scenario.name} satisfies the persistence contract`, async () => {
      const persistence = scenario.createPersistence();
      const key = `persistence-contract:${scenario.name}`;

      assert.equal(await persistence.load(key), undefined);
      await persistence.save(key, 7);
      assert.equal(await persistence.load(key), 7);
      await persistence.clear(key);
      assert.equal(await persistence.load(key), undefined);
    });
  }

  void it('owns mutable state across construction, mutation, snapshots, and persistence', async () => {
    const initialState: MutableStateInterface = { 'nested': { 'count': 1 }, 'values': ['initial'] };
    const persistence = MemoryPersistence.create<MutableStateInterface>();
    const store = Store.create({ 'initialState': initialState, 'key': 'ownership', 'persistence': persistence });

    initialState.nested.count = 9;
    initialState.values.push('caller');

    assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 1 }, 'values': ['initial'] });

    const suppliedState: MutableStateInterface = { 'nested': { 'count': 2 }, 'values': ['supplied'] };
    await store.setState(suppliedState);
    suppliedState.nested.count = 7;
    suppliedState.values.push('caller');

    assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 2 }, 'values': ['supplied'] });

    await store.update((snapshot): MutableStateInterface => {
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
      throw new Error('Expected persisted state');
    }
    persisted.nested.count = 13;
    persisted.values.push('loaded');

    assert.deepEqual(await persistence.load('ownership'), { 'nested': { 'count': 3 }, 'values': ['supplied', 'updated'] });
  });

  void it('detaches Store persistence ingress and egress from collaborator mutations', async () => {
    const persisted: MutableStateInterface = { 'nested': { 'count': 5 }, 'values': ['persisted'] };
    const persistence: StatePersistenceInterface<MutableStateInterface> = {
      'clear': async (): Promise<void> => undefined,
      'load': async (): Promise<MutableStateInterface> => persisted,
      'save': async (_key: string, state: MutableStateInterface): Promise<void> => {
        state.nested.count = 99;
        state.values.push('persistence');
      }
    };
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
    const persistence = MemoryPersistence.create<MutableStateInterface>();
    const state: MutableStateInterface = { 'nested': { 'count': 4 }, 'values': ['saved'] };

    await persistence.save('memory-ownership', state);
    state.nested.count = 14;
    state.values.push('caller');

    assert.deepEqual(await persistence.load('memory-ownership'), { 'nested': { 'count': 4 }, 'values': ['saved'] });
  });
});
