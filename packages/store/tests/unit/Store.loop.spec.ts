import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import 'fake-indexeddb/auto';

import {
  BrowserPersistence, StorageTarget
} from '../../src/browser/index.js';
import type { BrowserStorageInterface } from '../../src/browser/index.js';
import {
  JsonStateCodec, MemoryPersistence, Store
} from '../../src/index.js';
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

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

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

  void it('uses browser memory persistence through the same store interface', async () => {
    const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.Memory });
    const store = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });

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
});
