import type { StoreInterface } from '@studnicky/store/interfaces';

import { Mutex } from '@studnicky/concurrency/mutex';
import { Context } from '@studnicky/context/node';
import { ContextStore } from '@studnicky/context/store/node';
import { MemoryPersistence, Store } from '@studnicky/store/node';
import { StrataStore } from '@studnicky/store/strata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorCapture } from '../../helpers/ErrorCapture.js';

class ContextStoreCompositionTests {
  static declaresCases(): void {
    void it('cannot reacquire the composition mutex and key', () => {
      const mutex = Mutex.create<string>();
      const context = Context.create({ 'name': 'request' });
      const layer = ContextStore.create<number>({
        'context': context,
        'createStore': (): StoreInterface<number> => {
          const result = Store.create({
            'initialState': 0,
            'key': 'counter',
            'mutex': mutex,
            'persistence': MemoryPersistence.create<number>()
          });
          return result;
        },
        'key': 'request-counter',
        'synchronizationIdentity': { 'key': 'counter', 'mutex': mutex }
      });
      const caught = ErrorCapture.thrown((): void => {
        StrataStore.create({ 'layers': [layer], 'mutex': mutex, 'mutexKey': 'counter' });
      });

      assert.ok(caught.message.includes('must not reuse its mutex and mutexKey'));
    });

    void it('relays independently scoped stores through one long-lived composition', async () => {
      const context = Context.create({ 'name': 'request' });
      const lowerMutex = Mutex.create<string>();
      const lowerSynchronizationIdentity = { 'key': 'request-cache', 'mutex': lowerMutex };
      let lowerStoreCreates = 0;
      const lower = ContextStore.create<number>({
        'context': context,
        'createStore': (): StoreInterface<number> => {
          lowerStoreCreates += 1;
          const result = Store.create({
            'initialState': 0,
            'key': 'request-cache',
            'mutex': lowerMutex,
            'persistence': MemoryPersistence.create<number>()
          });
          return result;
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

      const firstScopeSnapshot = firstScope.execute((): number => {
        const result = lower.getSnapshot();
        return result;
      });

      assert.equal(firstScopeSnapshot, 7);
      assert.equal(lowerStoreCreates, 2);
      store.dispose();
      firstScope.terminate();
      secondScope.terminate();
    });
  }
}

void describe('ContextStore composition', () => {
  ContextStoreCompositionTests.declaresCases();
});
