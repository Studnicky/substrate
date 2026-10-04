import type { StoreInterface } from '@studnicky/store/interfaces';

import * as MutexBrowser from '@studnicky/concurrency/mutex';
import { Mutex } from '@studnicky/concurrency/mutex';
import * as ContextBrowser from '@studnicky/context/browser';
import { Context } from '@studnicky/context/node';
import * as ContextStoreBrowser from '@studnicky/context/store/browser';
import { ContextStore } from '@studnicky/context/store/node';
import * as StoreBrowser from '@studnicky/store/browser';
import { MemoryPersistence, Store } from '@studnicky/store/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MutableScopedStateEntity } from './entities/MutableScopedStateEntity.js';

import { ErrorCapture } from '../../helpers/ErrorCapture.js';
import { StoreTestError } from '../../helpers/StoreTestError.js';

class ContextStoreTests {
  static declaresGroup1(): void {
    void it('creates one backing store per active scope and relays the active scope update', async () => {
      const context = Context.create({ 'name': 'request' });
      let creates = 0;
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        creates += 1;

        const result = ContextStoreTests.createBackingStore();
        return result;
      });
      const scope = context.initialize();

      await scope.execute(async (): Promise<void> => {
        const notifications: number[] = [];
        store.subscribe(async (snapshot): Promise<void> => {
          await Promise.resolve();
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
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        creates += 1;

        const result = ContextStoreTests.createBackingStore();
        return result;
      });
      const firstScope = context.initialize();
      const secondScope = context.initialize();

      const firstValue = await firstScope.execute(async (): Promise<number> => {
        await store.setState(1);
        const result = store.getSnapshot();
        return result;
      });
      const secondValue = await secondScope.execute(async (): Promise<number> => {
        await store.update((snapshot): number => {
          const result = snapshot + 2;
          return result;
        });
        const result = store.getSnapshot();
        return result;
      });

      assert.equal(firstValue, 1);
      assert.equal(secondValue, 2);
      assert.equal(creates, 2);
    });

    void it('exposes configured synchronization identity without resolving a scope store', () => {
      const context = Context.create({ 'name': 'request' });
      let creates = 0;
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        creates += 1;

        const result = ContextStoreTests.createBackingStore();
        return result;
      });

      const expectedIdentity: unknown = ContextStoreTests.CONTEXT_SYNCHRONIZATION_IDENTITY;
      assert.deepEqual(store.getSynchronizationIdentity(), expectedIdentity);
      assert.equal(creates, 0);
    });

    void it('requires an active Context scope before resolving a backing store', () => {
      const context = Context.create({ 'name': 'request' });
      let creates = 0;
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        creates += 1;

        const result = ContextStoreTests.createBackingStore();
        return result;
      });

      ErrorCapture.thrownMessage((): void => {
        store.getSnapshot();
      }, 'requires an active Context scope');
      assert.equal(creates, 0);
    });
  }

  static declaresGroup2(): void {
    void it('preserves Store mutation protection while notifying listeners', async () => {
      const context = Context.create({ 'name': 'request' });
      const store = ContextStoreTests.createContextStore(
        context,
        ContextStoreTests.createBackingStore
      );
      const scope = context.initialize();

      await scope.execute(async (): Promise<void> => {
        store.subscribe(async (): Promise<void> => {
          await ErrorCapture.rejectionMessage(
            store.update((snapshot): number => {
              const result = snapshot + 1;
              return result;
            }),
            'not allowed from a Store listener'
          );
        });

        await store.setState(1);
        await store.clear();

        assert.equal(store.getSnapshot(), 0);
      });
    });

    void it('rejects a context value that does not satisfy the Store contract', () => {
      const context = Context.create({ 'name': 'request' });
      const store = ContextStoreTests.createContextStore(
        context,
        ContextStoreTests.createBackingStore
      );
      const scope = context.initialize();

      scope.execute((): void => {
        const wrongValue = Object.defineProperty({}, 'clear', {
          'get': (): never => {
            throw new StoreTestError(
              'ContextStore must not invoke accessors while validating a context value'
            );
          }
        });
        context.set('request-store', wrongValue);

        ErrorCapture.thrownMessage((): void => {
          store.getSnapshot();
        }, 'does not contain a StoreInterface');
      });
    });

    void it('rejects scope backing stores with a different synchronization identity', () => {
      const context = Context.create({ 'name': 'request' });
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        const result = Store.create({
          'initialState': 0,
          'key': 'other-store',
          'persistence': MemoryPersistence.create<number>()
        });
        return result;
      });
      const scope = context.initialize();

      scope.execute((): void => {
        ErrorCapture.thrownMessage((): void => {
          store.getSnapshot();
        }, 'must match its configured synchronizationIdentity');
      });
    });

    void it('uses public browser exports to isolate scoped stores and propagate updates', async () => {
      const context = ContextBrowser.Context.create({ 'name': 'browser-request' });
      const mutex = MutexBrowser.Mutex.create<string>();
      const synchronizationIdentity = { 'key': 'browser-request-store', 'mutex': mutex };
      const store = ContextStoreBrowser.ContextStore.create<number>({
        'context': context,
        'createStore': (): StoreInterface<number> => {
          const result = StoreBrowser.Store.create({
            'initialState': 0,
            'key': 'browser-request-store',
            'mutex': mutex,
            'persistence': StoreBrowser.MemoryPersistence.create<number>()
          });
          return result;
        },
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
  }

  static declaresGroup3(): void {
    void it('snapshots its synchronization identity before stores enter a Context scope', async () => {
      const context = Context.create({ 'name': 'request' });
      const identity = { 'key': 'request-store', 'mutex': ContextStoreTests.CONTEXT_MUTEX };
      const store = ContextStore.create<number>({
        'context': context,
        'createStore': ContextStoreTests.createBackingStore,
        'key': 'request-store',
        'synchronizationIdentity': identity
      });

      identity.key = 'changed-by-caller';
      const exportedIdentity = store.getSynchronizationIdentity();
      Reflect.set(exportedIdentity, 'key', 'changed-by-consumer');

      const expectedIdentity: unknown = ContextStoreTests.CONTEXT_SYNCHRONIZATION_IDENTITY;
      assert.deepEqual(store.getSynchronizationIdentity(), expectedIdentity);

      const scope = context.initialize();
      await scope.execute(async (): Promise<void> => {
        await store.setState(3);

        assert.equal(store.getSnapshot(), 3);
      });
    });

    void it('rejects backing stores with a mismatched synchronization mutex', () => {
      const context = Context.create({ 'name': 'request' });
      const store = ContextStoreTests.createContextStore(context, (): StoreInterface<number> => {
        const result = Store.create({
          'initialState': 0,
          'key': 'request-store',
          'mutex': Mutex.create<string>(),
          'persistence': MemoryPersistence.create<number>()
        });
        return result;
      });
      const scope = context.initialize();

      scope.execute((): void => {
        ErrorCapture.thrownMessage((): void => {
          store.getSnapshot();
        }, 'must match its configured synchronizationIdentity');
      });
    });

    void it('detaches ContextStore inputs, updater views, and snapshots', async () => {
      const context = Context.create({ 'name': 'request' });
      const mutex = Mutex.create<string>();
      const store = ContextStore.create<MutableScopedStateEntity.Type>({
        'context': context,
        'createStore': (): StoreInterface<MutableScopedStateEntity.Type> => {
          const result = Store.create({
            'initialState': { 'nested': { 'count': 0 } },
            'key': 'mutable-request-store',
            'mutex': mutex,
            'persistence': MemoryPersistence.create<MutableScopedStateEntity.Type>()
          });
          return result;
        },
        'key': 'mutable-request-store',
        'synchronizationIdentity': { 'key': 'mutable-request-store', 'mutex': mutex }
      });
      const scope = context.initialize();

      await scope.execute(async (): Promise<void> => {
        const supplied: MutableScopedStateEntity.Type = { 'nested': { 'count': 1 } };
        await store.setState(supplied);
        supplied.nested.count = 9;

        await store.update((snapshot): MutableScopedStateEntity.Type => {
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
  }

  private static readonly CONTEXT_MUTEX = Mutex.create<string>();

  private static readonly CONTEXT_SYNCHRONIZATION_IDENTITY = {
    'key': 'request-store',
    'mutex': ContextStoreTests.CONTEXT_MUTEX
  };

  private static createContextStore(
    context: Context,
    factory: () => StoreInterface<number>
  ): ContextStore<number> {
    const result = ContextStore.create({
      'context': context,
      'createStore': factory,
      'key': 'request-store',
      'synchronizationIdentity': ContextStoreTests.CONTEXT_SYNCHRONIZATION_IDENTITY
    });

    return result;
  }

  private static createBackingStore(): StoreInterface<number> {
    const result = Store.create({
      'initialState': 0,
      'key': 'request-store',
      'mutex': ContextStoreTests.CONTEXT_MUTEX,
      'persistence': MemoryPersistence.create<number>()
    });

    return result;
  }
}

void describe('ContextStore', () => {
  ContextStoreTests.declaresGroup1();
  ContextStoreTests.declaresGroup2();
  ContextStoreTests.declaresGroup3();
});
