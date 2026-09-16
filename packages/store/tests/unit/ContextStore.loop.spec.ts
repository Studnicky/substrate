import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Context as BrowserContext } from '@studnicky/context/browser';
import { Context } from '@studnicky/context/node';
import { Mutex as BrowserMutex } from '@studnicky/mutex/browser';
import { Mutex } from '@studnicky/mutex/node';
import {
  ContextStore as BrowserContextStore, MemoryPersistence as BrowserMemoryPersistence, Store as BrowserStore
} from '@studnicky/store/browser';
import type { StoreInterface as BrowserStoreInterface } from '@studnicky/store/interfaces';

import { ContextStore } from '../../src/ContextStore.js';
import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store } from '../../src/node/Store.js';
import type { StoreInterface } from '../../src/interfaces/StoreInterface.js';

interface MutableScopedStateInterface {
  'nested': { 'count': number };
}

const CONTEXT_MUTEX = Mutex.create<string>();
const CONTEXT_SYNCHRONIZATION_IDENTITY = { 'key': 'request-store', 'mutex': CONTEXT_MUTEX };

function createContextStore(
  context: Context,
  factory: () => StoreInterface<number>
): ContextStore<number> {
  const result = ContextStore.create({
    'context': context,
    'createStore': factory,
    'key': 'request-store',
    'synchronizationIdentity': CONTEXT_SYNCHRONIZATION_IDENTITY
  });

  return result;
}

function createBackingStore(): StoreInterface<number> {
  const result = Store.create({
    'initialState': 0,
    'key': 'request-store',
    'mutex': CONTEXT_MUTEX,
    'persistence': MemoryPersistence.create<number>()
  });

  return result;
}

void describe('ContextStore', () => {
  void it('creates one backing store per active scope and relays the active scope update', async () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;

      return createBackingStore();
    });
    const scope = context.initialize();

    await scope.execute(async (): Promise<void> => {
      const notifications: number[] = [];
      store.subscribe(async (snapshot): Promise<void> => {
        notifications.push(snapshot);
      });

      await store.setState(3);
      await store.hydrate();

      assert.equal(store.getSnapshot(), 3);
      assert.deepEqual(notifications, [3]);
    });

    assert.equal(creates, 1);
  });

  void it('isolates backing stores between context scopes', async () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;

      return createBackingStore();
    });
    const firstScope = context.initialize();
    const secondScope = context.initialize();

    const firstValue = await firstScope.execute(async (): Promise<number> => {
      await store.setState(1);
      return store.getSnapshot();
    });
    const secondValue = await secondScope.execute(async (): Promise<number> => {
      await store.update((snapshot): number => snapshot + 2);
      return store.getSnapshot();
    });

    assert.equal(firstValue, 1);
    assert.equal(secondValue, 2);
    assert.equal(creates, 2);
  });

  void it('exposes configured synchronization identity without resolving a scope store', () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;

      return createBackingStore();
    });

    assert.deepEqual(store.getSynchronizationIdentity(), CONTEXT_SYNCHRONIZATION_IDENTITY);
    assert.equal(creates, 0);
  });

  void it('requires an active Context scope before resolving a backing store', () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;

      return createBackingStore();
    });

    assert.throws((): void => {
      store.getSnapshot();
    }, /requires an active Context scope/u);
    assert.equal(creates, 0);
  });

  void it('preserves Store mutation protection while notifying listeners', async () => {
    const context = Context.create({ 'name': 'request' });
    const store = createContextStore(context, createBackingStore);
    const scope = context.initialize();

    await scope.execute(async (): Promise<void> => {
      store.subscribe(async (): Promise<void> => {
        await assert.rejects(store.update((snapshot): number => snapshot + 1), /not allowed from a Store listener/u);
      });

      await store.setState(1);
      await store.clear();

      assert.equal(store.getSnapshot(), 0);
    });
  });

  void it('rejects a context value that does not satisfy the Store contract', () => {
    const context = Context.create({ 'name': 'request' });
    const store = createContextStore(context, createBackingStore);
    const scope = context.initialize();

    scope.execute((): void => {
      const wrongValue = Object.defineProperty({}, 'clear', {
        'get': (): never => {
          throw new Error('ContextStore must not invoke accessors while validating a context value');
        }
      });
      context.set('request-store', wrongValue);

      assert.throws((): void => {
        store.getSnapshot();
      }, /does not contain a StoreInterface/u);
    });
  });

  void it('rejects scope backing stores with a different synchronization identity', () => {
    const context = Context.create({ 'name': 'request' });
    const store = createContextStore(context, (): StoreInterface<number> => Store.create({
      'initialState': 0,
      'key': 'other-store',
      'persistence': MemoryPersistence.create<number>()
    }));
    const scope = context.initialize();

    scope.execute((): void => {
      assert.throws((): void => {
        store.getSnapshot();
      }, /must match its configured synchronizationIdentity/u);
    });
  });

  void it('uses public browser exports to isolate scoped stores and propagate updates', async () => {
    const context = BrowserContext.create({ 'name': 'browser-request' });
    const mutex = BrowserMutex.create<string>();
    const synchronizationIdentity = { 'key': 'browser-request-store', 'mutex': mutex };
    const store = BrowserContextStore.create<number>({
      'context': context,
      'createStore': (): BrowserStoreInterface<number> => BrowserStore.create({
        'initialState': 0,
        'key': 'browser-request-store',
        'mutex': mutex,
        'persistence': BrowserMemoryPersistence.create<number>()
      }),
      'key': 'browser-request-store',
      'synchronizationIdentity': synchronizationIdentity
    });
    const propagated: number[] = [];
    store.subscribe((snapshot): void => {
      propagated.push(snapshot);
    });

    const firstScope = context.initialize();
    const secondScope = context.initialize();
    const firstSnapshot = await firstScope.execute(async (): Promise<number> => {
      await firstScope.await(store.setState(1));
      const result = store.getSnapshot();
      return result;
    });
    const secondSnapshot = await secondScope.execute(async (): Promise<number> => {
      await secondScope.await(store.setState(2));
      const result = store.getSnapshot();
      return result;
    });

    assert.equal(firstSnapshot, 1);
    assert.equal(secondSnapshot, 2);
    assert.deepEqual(propagated, [1, 2]);
  });

  void it('snapshots its synchronization identity before stores enter a Context scope', async () => {
    const context = Context.create({ 'name': 'request' });
    const identity = { 'key': 'request-store', 'mutex': CONTEXT_MUTEX };
    const store = ContextStore.create<number>({
      'context': context,
      'createStore': createBackingStore,
      'key': 'request-store',
      'synchronizationIdentity': identity
    });

    identity.key = 'changed-by-caller';
    const exportedIdentity = store.getSynchronizationIdentity();
    Reflect.set(exportedIdentity, 'key', 'changed-by-consumer');

    assert.deepEqual(store.getSynchronizationIdentity(), CONTEXT_SYNCHRONIZATION_IDENTITY);

    const scope = context.initialize();
    await scope.execute(async (): Promise<void> => {
      await store.setState(3);

      assert.equal(store.getSnapshot(), 3);
    });
  });

  void it('rejects backing stores with a mismatched synchronization mutex', () => {
    const context = Context.create({ 'name': 'request' });
    const store = createContextStore(context, (): StoreInterface<number> => Store.create({
      'initialState': 0,
      'key': 'request-store',
      'mutex': Mutex.create<string>(),
      'persistence': MemoryPersistence.create<number>()
    }));
    const scope = context.initialize();

    scope.execute((): void => {
      assert.throws((): void => {
        store.getSnapshot();
      }, /must match its configured synchronizationIdentity/u);
    });
  });

  void it('detaches ContextStore inputs, updater views, and snapshots', async () => {
    const context = Context.create({ 'name': 'request' });
    const mutex = Mutex.create<string>();
    const store = ContextStore.create<MutableScopedStateInterface>({
      'context': context,
      'createStore': (): StoreInterface<MutableScopedStateInterface> => Store.create({
        'initialState': { 'nested': { 'count': 0 } },
        'key': 'mutable-request-store',
        'mutex': mutex,
        'persistence': MemoryPersistence.create<MutableScopedStateInterface>()
      }),
      'key': 'mutable-request-store',
      'synchronizationIdentity': { 'key': 'mutable-request-store', 'mutex': mutex }
    });
    const scope = context.initialize();

    await scope.execute(async (): Promise<void> => {
      const supplied: MutableScopedStateInterface = { 'nested': { 'count': 1 } };
      await store.setState(supplied);
      supplied.nested.count = 9;

      await store.update((snapshot): MutableScopedStateInterface => {
        assert.throws((): void => {
          snapshot.nested.count = 10;
        });

        return { 'nested': { 'count': snapshot.nested.count + 1 } };
      });

      const snapshot = store.getSnapshot();
      assert.throws((): void => {
        snapshot.nested.count = 11;
      });
      assert.deepEqual(store.getSnapshot(), { 'nested': { 'count': 2 } });
    });
  });
});
