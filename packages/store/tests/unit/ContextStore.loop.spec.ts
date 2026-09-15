import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Context } from '@studnicky/context/node';

import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store } from '../../src/Store.js';
import { ContextStore } from '../../src/node/ContextStore.js';
import type { StoreInterface } from '../../src/interfaces/StoreInterface.js';

function createContextStore(
  context: Context,
  factory: () => StoreInterface<number>
): ContextStore<number> {
  const result = ContextStore.create({
    'context': context,
    'createStore': factory,
    'key': 'request-store'
  });

  return result;
}

void describe('ContextStore', () => {
  void it('creates one backing store per active scope', async () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;
      return Store.create({
        'initialState': 0,
        'key': 'request-store:' + creates,
        'persistence': MemoryPersistence.create<number>()
      });
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
      return Store.create({
        'initialState': 0,
        'key': 'request-store:' + creates,
        'persistence': MemoryPersistence.create<number>()
      });
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

  void it('requires an active Context scope before resolving a backing store', () => {
    const context = Context.create({ 'name': 'request' });
    let creates = 0;
    const store = createContextStore(context, (): StoreInterface<number> => {
      creates += 1;
      return Store.create({
        'initialState': 0,
        'key': 'request-store',
        'persistence': MemoryPersistence.create<number>()
      });
    });

    assert.throws((): void => {
      store.getSnapshot();
    }, /requires an active Context scope/u);
    assert.equal(creates, 0);
  });

  void it('preserves Store mutation protection while notifying listeners', async () => {
    const context = Context.create({ 'name': 'request' });
    const store = createContextStore(context, (): StoreInterface<number> => Store.create({
      'initialState': 0,
      'key': 'request-store',
      'persistence': MemoryPersistence.create<number>()
    }));
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
    const store = createContextStore(context, (): StoreInterface<number> => Store.create({
      'initialState': 0,
      'key': 'request-store',
      'persistence': MemoryPersistence.create<number>()
    }));
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
});
