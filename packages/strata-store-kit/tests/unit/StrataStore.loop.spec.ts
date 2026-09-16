import {
  ContextStore, JsonStateCodec, MemoryPersistence, Store
} from '@studnicky/store/node';
import type {
  StatePersistenceInterface, StoreInterface
} from '@studnicky/store/interfaces';
import {
  BrowserPersistence, StorageTarget
} from '@studnicky/store/browser';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Context } from '@studnicky/context/node';
import { Mutex } from '@studnicky/mutex/node';

import { StrataStore } from '../../src/node/StrataStore.js';
import { StrataStore as BrowserStrataStore } from '../../src/browser/StrataStore.js';

class BrowserStorage implements Storage {
  readonly #entries = new Map<string, string>();

  public get length(): number {
    return this.#entries.size;
  }

  public clear(): void {
    this.#entries.clear();
  }

  public getItem(key: string): string | null {
    return this.#entries.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.#entries.keys()).at(index) ?? null;
  }

  public removeItem(key: string): void {
    this.#entries.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.#entries.set(key, value);
  }
}

class GatedPersistence implements StatePersistenceInterface<number> {
  readonly #entries = new Map<string, number>();
  readonly #saveStarted = Promise.withResolvers<void>();
  readonly #saveGate = Promise.withResolvers<void>();
  #saveBlocked = false;

  public blockNextSave(): void {
    this.#saveBlocked = true;
  }

  public async clear(key: string): Promise<void> {
    this.#entries.delete(key);
  }

  public async load(key: string): Promise<number | undefined> {
    const result = this.#entries.get(key);

    return result;
  }

  public async save(key: string, state: number): Promise<void> {
    if (this.#saveBlocked) {
      this.#saveBlocked = false;
      this.#saveStarted.resolve();
      await this.#saveGate.promise;
    }
    this.#entries.set(key, state);
  }

  public releaseSave(): void {
    this.#saveGate.resolve();
  }

  public async waitForSave(): Promise<void> {
    await this.#saveStarted.promise;
  }
}

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

void describe('StrataStore', () => {
  void it('propagates lower-store changes to every higher store before the write resolves', async () => {
    const lower = Store.create({ 'initialState': 0, 'key': 'lower', 'persistence': MemoryPersistence.create<number>() });
    const middle = Store.create({ 'initialState': 0, 'key': 'middle', 'persistence': MemoryPersistence.create<number>() });
    const upper = Store.create({ 'initialState': 0, 'key': 'upper', 'persistence': MemoryPersistence.create<number>() });
    const store = StrataStore.create({ 'layers': [lower, middle, upper] });

    await lower.setState(1);

    assert.equal(middle.getSnapshot(), 1);
    assert.equal(upper.getSnapshot(), 1);
    assert.equal(store.getSnapshot(), 1);

    await store.update((snapshot): number => {
      return snapshot + 1;
    });

    assert.equal(lower.getSnapshot(), 2);
    assert.equal(middle.getSnapshot(), 2);
    assert.equal(upper.getSnapshot(), 2);
  });

  void it('publishes final-layer snapshots from lower-layer changes', async () => {
    const lower = Store.create({ 'initialState': 0, 'key': 'lower', 'persistence': MemoryPersistence.create<number>() });
    const upper = Store.create({ 'initialState': 0, 'key': 'upper', 'persistence': MemoryPersistence.create<number>() });
    const store = StrataStore.create({ 'layers': [lower, upper] });
    const snapshots: number[] = [];
    const unsubscribe = store.subscribe((snapshot): void => {
      snapshots.push(snapshot);
    });

    await lower.setState(1);
    unsubscribe();
    await lower.setState(2);

    assert.deepEqual(snapshots, [1]);
    assert.equal(store.getSnapshot(), 2);
  });

  void it('clears every layer and its durable state', async () => {
    const durablePersistence = MemoryPersistence.create<number>();
    const cache = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': MemoryPersistence.create<number>() });
    const durable = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': durablePersistence });
    const store = StrataStore.create({ 'layers': [cache, durable] });

    await store.setState(8);
    await store.clear();

    assert.equal(cache.getSnapshot(), 0);
    assert.equal(durable.getSnapshot(), 0);
    assert.equal(await durablePersistence.load('counter'), undefined);
  });

  void it("rejects layers that reacquire the composition mutex and key during construction", () => {
    const mutex = Mutex.create<string>();
    const layer = Store.create({
      "initialState": 0,
      "key": "counter",
      "mutex": mutex,
      "persistence": MemoryPersistence.create<number>()
    });

    assert.throws((): void => {
      StrataStore.create({ "layers": [layer], "mutex": mutex, "mutexKey": "counter" });
    }, /must not reuse its mutex and mutexKey/u);

    const context = Context.create({ "name": "request" });
    const contextLayer = ContextStore.create<number>({
      "context": context,
      "createStore": (): StoreInterface<number> => Store.create({
        "initialState": 0,
        "key": "counter",
        "mutex": mutex,
        "persistence": MemoryPersistence.create<number>()
      }),
      "key": "request-counter",
      "synchronizationIdentity": { "key": "counter", "mutex": mutex }
    });
    assert.throws((): void => {
      StrataStore.create({ "layers": [contextLayer], "mutex": mutex, "mutexKey": "counter" });
    }, /must not reuse its mutex and mutexKey/u);
  });

  void it('serializes independent compositions through an injected mutex and stable mutex key', async () => {
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
    const firstLayer = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });
    const secondLayer = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });
    const first = StrataStore.create({ 'layers': [firstLayer], 'mutex': mutex, 'mutexKey': 'counter' });
    const second = StrataStore.create({ 'layers': [secondLayer], 'mutex': mutex, 'mutexKey': 'counter' });

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
    first.dispose();
    second.dispose();
  });

  void it('stops propagation after disposal', async () => {
    const lower = Store.create({ 'initialState': 0, 'key': 'lower', 'persistence': MemoryPersistence.create<number>() });
    const upper = Store.create({ 'initialState': 0, 'key': 'upper', 'persistence': MemoryPersistence.create<number>() });
    const store = StrataStore.create({ 'layers': [lower, upper] });

    await lower.setState(1);
    store.dispose();
    await lower.setState(2);

    assert.equal(store.getSnapshot(), 1);
  });

  void it('hydrates the durable target and restores the source cache before updates', async () => {
    const durablePersistence = MemoryPersistence.create<number>();
    const durable = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': durablePersistence });

    await durable.setState(4);

    const cache = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': MemoryPersistence.create<number>() });
    const restored = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': durablePersistence });
    const store = StrataStore.create({ 'layers': [cache, restored] });

    await store.hydrate();
    await store.update((snapshot): number => {
      return snapshot + 1;
    });

    assert.equal(cache.getSnapshot(), 5);
    assert.equal(restored.getSnapshot(), 5);
    assert.equal(store.getSnapshot(), 5);
  });

  void it('hydrates and propagates through a durable browser storage layer', async () => {
    const storage = new BrowserStorage();
    const persistence = BrowserPersistence.create({
      'codec': NUMBER_CODEC,
      'storage': storage,
      'storageTarget': StorageTarget.LocalStorage
    });
    const seeded = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });
    await seeded.setState(7);

    const cache = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': MemoryPersistence.create<number>() });
    const durable = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': persistence });
    const store = BrowserStrataStore.create({ 'layers': [cache, durable] });

    await store.hydrate();
    await store.update((snapshot): number => snapshot + 1);

    assert.equal(cache.getSnapshot(), 8);
    assert.equal(durable.getSnapshot(), 8);
    assert.equal(await persistence.load('counter'), 8);
  });

  void it('rejects repeated layers before propagation subscriptions are connected', () => {
    const first = Store.create({ 'initialState': 0, 'key': 'first', 'persistence': MemoryPersistence.create<number>() });
    const second = Store.create({ 'initialState': 0, 'key': 'second', 'persistence': MemoryPersistence.create<number>() });

    assert.throws(() => StrataStore.create({ 'layers': [first, first] }), /unique store layers/u);
    assert.throws(() => StrataStore.create({ 'layers': [first, second, first] }), /unique store layers/u);
  });

  void it('serializes hydration behind an active write', async () => {
    const cachePersistence = new GatedPersistence();
    const durablePersistence = MemoryPersistence.create<number>();
    const durable = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': durablePersistence });
    await durable.setState(1);
    const cache = Store.create({ 'initialState': 0, 'key': 'counter', 'persistence': cachePersistence });
    const store = StrataStore.create({ 'layers': [cache, durable] });
    cachePersistence.blockNextSave();

    const write = store.setState(2);
    await cachePersistence.waitForSave();
    const hydration = store.hydrate();
    cachePersistence.releaseSave();

    await Promise.all([write, hydration]);

    assert.equal(cache.getSnapshot(), 2);
    assert.equal(durable.getSnapshot(), 2);
  });

  void it('relays updates from independently scoped Context stores through one long-lived composition', async () => {
    const context = Context.create({ 'name': 'request' });
    const lowerMutex = Mutex.create<string>();
    const lowerSynchronizationIdentity = { 'key': 'request-cache', 'mutex': lowerMutex };
    let lowerStoreCreates = 0;
    const lower = ContextStore.create<number>({
      'context': context,
      'createStore': (): StoreInterface<number> => {
        lowerStoreCreates += 1;

        return Store.create({
          'initialState': 0,
          'key': 'request-cache',
          'mutex': lowerMutex,
          'persistence': MemoryPersistence.create<number>()
        });
      },
      'key': 'request-cache',
      'synchronizationIdentity': lowerSynchronizationIdentity
    });
    const durablePersistence = MemoryPersistence.create<number>();
    const durable = Store.create({
      'initialState': 0,
      'key': 'durable-counter',
      'persistence': durablePersistence
    });
    const store = StrataStore.create({ 'layers': [lower, durable] });
    const firstScope = context.initialize();
    const secondScope = context.initialize();

    await firstScope.execute(async (): Promise<void> => {
      await store.setState(7);

      assert.equal(lower.getSnapshot(), 7);
      assert.equal(store.getSnapshot(), 7);
      assert.equal(durable.getSnapshot(), 7);
      assert.equal(await durablePersistence.load('durable-counter'), 7);
    });

    await secondScope.execute(async (): Promise<void> => {
      assert.equal(lower.getSnapshot(), 0);
      assert.equal(store.getSnapshot(), 7);

      await store.setState(2);

      assert.equal(lower.getSnapshot(), 2);
      assert.equal(store.getSnapshot(), 2);
      assert.equal(await durablePersistence.load('durable-counter'), 2);
    });

    const firstScopeSnapshot = firstScope.execute((): number => lower.getSnapshot());

    assert.equal(firstScopeSnapshot, 7);
    assert.equal(lowerStoreCreates, 2);
    store.dispose();
    firstScope.terminate();
    secondScope.terminate();
  });
});
