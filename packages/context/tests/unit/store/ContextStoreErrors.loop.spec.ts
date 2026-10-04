import type { StoreInterface } from '@studnicky/store/interfaces';

import { Mutex } from '@studnicky/concurrency/mutex';
import { Context } from '@studnicky/context/node';
import {
  ContextScopeInactiveError,
  ContextStore,
  ContextStoreFactoryError,
  ContextStoreKeyConflictError,
  ContextStoreOptionsError,
  SynchronizationIdentityMismatchError
} from '@studnicky/context/store/node';
import { MemoryPersistence, Store } from '@studnicky/store/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorCapture } from '../../helpers/ErrorCapture.js';

class ContextStoreErrorsTests {
  static declaresCases(): void {
    void it('rejects a synchronization identity without a mutex contract', () => {
      const caught = ErrorCapture.thrown((): void => {
        ContextStore.create({
          'context': Context.create({ 'name': 'options' }),
          'createStore': (): StoreInterface<number> => {
            const result = ContextStoreErrorsTests.createStore(
              'errors',
              ContextStoreErrorsTests.MUTEX
            );
            return result;
          },
          'key': 'errors',
          'synchronizationIdentity': {
            'key': 'errors',
            'mutex': Object.defineProperty(Mutex.create<string>(), 'runExclusive', {
              'value': undefined
            })
          }
        });
      });

      assert.ok(caught instanceof ContextStoreOptionsError);
      assert.equal(caught.code, 'store.contextStoreInvalidOptions');
    });

    void it('requires an active Context scope', () => {
      const context = Context.create({ 'name': 'inactive' });
      const store = ContextStoreErrorsTests.createContextStore(
        context,
        'errors',
        (): StoreInterface<number> => {
          const result = ContextStoreErrorsTests.createStore(
            'errors',
            ContextStoreErrorsTests.MUTEX
          );
          return result;
        }
      );
      const caught = ErrorCapture.thrown((): void => {
        store.getSnapshot();
      });

      assert.ok(caught instanceof ContextScopeInactiveError);
      assert.equal(caught.code, 'store.contextScopeInactive');
    });

    void it('rejects factories that return a non-store value', () => {
      const context = Context.create({ 'name': 'factory' });
      const store = ContextStoreErrorsTests.createContextStore(
        context,
        'errors',
        (): StoreInterface<number> => {
          const result = Object.defineProperty(
            ContextStoreErrorsTests.createStore('errors', ContextStoreErrorsTests.MUTEX),
            'clear',
            { 'value': undefined }
          );
          return result;
        }
      );
      const caught = ErrorCapture.thrown((): void => {
        context.initialize().execute((): void => {
          store.getSnapshot();
        });
      });

      assert.ok(caught instanceof ContextStoreFactoryError);
      assert.equal(caught.code, 'store.contextFactoryInvalid');
    });

    void it('rejects a Context key that holds a foreign value', () => {
      const context = Context.create({ 'name': 'conflict' });
      const store = ContextStoreErrorsTests.createContextStore(
        context,
        'errors',
        (): StoreInterface<number> => {
          const result = ContextStoreErrorsTests.createStore(
            'errors',
            ContextStoreErrorsTests.MUTEX
          );
          return result;
        }
      );
      const caught = ErrorCapture.thrown((): void => {
        context.initialize({ 'errors': 'foreign' }).execute((): void => {
          store.getSnapshot();
        });
      });

      assert.ok(caught instanceof ContextStoreKeyConflictError);
      assert.equal(caught.code, 'store.contextKeyConflict');
    });

    void it('rejects backing stores with a different synchronization identity', () => {
      const context = Context.create({ 'name': 'identity' });
      const store = ContextStoreErrorsTests.createContextStore(
        context,
        'errors',
        (): StoreInterface<number> => {
          const result = ContextStoreErrorsTests.createStore(
            'other',
            ContextStoreErrorsTests.MUTEX
          );
          return result;
        }
      );
      const caught = ErrorCapture.thrown((): void => {
        context.initialize().execute((): void => {
          store.getSnapshot();
        });
      });

      assert.ok(caught instanceof SynchronizationIdentityMismatchError);
      assert.equal(caught.code, 'store.synchronizationIdentityMismatch');
    });
  }

  private static readonly MUTEX = Mutex.create<string>();

  private static createContextStore(
    context: Context,
    key: string,
    createStore: () => StoreInterface<number>
  ): ContextStore<number> {
    const result = ContextStore.create({
      'context': context,
      'createStore': createStore,
      'key': key,
      'synchronizationIdentity': { 'key': key, 'mutex': ContextStoreErrorsTests.MUTEX }
    });

    return result;
  }

  private static createStore(key: string, mutex: Mutex<string>): StoreInterface<number> {
    const result = Store.create({
      'initialState': 0,
      'key': key,
      'mutex': mutex,
      'persistence': MemoryPersistence.create<number>()
    });

    return result;
  }
}

void describe('ContextStore errors', () => {
  ContextStoreErrorsTests.declaresCases();
});
