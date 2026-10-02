import { Context } from '@studnicky/context/node';
import { Mutex } from '@studnicky/mutex/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BrowserStorageInterface } from '../../src/browser/BrowserStorageInterface.js';
import type { StoreInterface } from '../../src/interfaces/StoreInterface.js';

import { BrowserPersistence } from '../../src/browser/BrowserPersistence.js';
import { StorageTarget } from '../../src/browser/StorageTarget.js';
import { ContextStore } from '../../src/ContextStore.js';
import { BrowserStorageError } from '../../src/errors/BrowserStorageError.js';
import { ContextScopeInactiveError } from '../../src/errors/ContextScopeInactiveError.js';
import { ContextStoreFactoryError } from '../../src/errors/ContextStoreFactoryError.js';
import { ContextStoreKeyConflictError } from '../../src/errors/ContextStoreKeyConflictError.js';
import { ContextStoreOptionsError } from '../../src/errors/ContextStoreOptionsError.js';
import { IndexedDbEntryError } from '../../src/errors/IndexedDbEntryError.js';
import { StateDecodeError } from '../../src/errors/StateDecodeError.js';
import { StateEncodeError } from '../../src/errors/StateEncodeError.js';
import { StoreError } from '../../src/errors/StoreError.js';
import { StoreListenerMutationError } from '../../src/errors/StoreListenerMutationError.js';
import { StrataStoreOptionsError } from '../../src/errors/StrataStoreOptionsError.js';
import { SynchronizationIdentityMismatchError } from '../../src/errors/SynchronizationIdentityMismatchError.js';
import { JsonStateCodec } from '../../src/JsonStateCodec.js';
import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store } from '../../src/node/Store.js';
import { StrataStore } from '../../src/strata/node/StrataStore.js';
import { DomExceptionRaiser } from '../helpers/DomExceptionRaiser.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import { IndexedDbSeed } from '../helpers/IndexedDbSeed.js';

import 'fake-indexeddb/auto';

interface StoreErrorCaseInterface {
  readonly 'code': string;
  readonly 'errorClass': abstract new (...argumentList: never[]) => StoreError;
  readonly 'name': string;
  readonly 'run': () => unknown;
}

class FailingStorage implements BrowserStorageInterface {
  public getItem(): string | null {
    DomExceptionRaiser.raise('read denied', 'SecurityError');
    return null;
  }

  public removeItem(): void {
    DomExceptionRaiser.raise('remove denied', 'SecurityError');
  }

  public setItem(): void {
    DomExceptionRaiser.raise('quota exceeded', 'QuotaExceededError');
  }
}

class StoreErrorsTests {
  static declaresGroup1(): void {
    const errorCases = [...StoreErrorsTests.SYNCHRONOUS_CASES, ...StoreErrorsTests.ASYNCHRONOUS_CASES];
    for (let index = 0; index < errorCases.length; index += 1) {
      const errorCase = errorCases[index];
      assert.ok(errorCase !== undefined);
      void it(`${errorCase.name} surfaces ${errorCase.errorClass.name}`, async () => {
        StoreErrorsTests.assertStoreError(await StoreErrorsTests.captureRejection(errorCase.run), errorCase);
      });
    }

    void it('keeps the platform SyntaxError as the cause of a decode failure', () => {
      const caught = ErrorCapture.thrown(() => {
        StoreErrorsTests.NUMBER_CODEC.decode('{');
      });

      assert.ok(caught instanceof StateDecodeError);
      assert.ok(caught.cause instanceof SyntaxError);
    });

    void it('keeps the platform DOMException as the cause of a Web Storage failure', async () => {
      const persistence = BrowserPersistence.create({ 'codec': StoreErrorsTests.NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });
      const caught = await StoreErrorsTests.captureRejection(async () => {return await persistence.save('key', 1);});

      assert.ok(caught instanceof BrowserStorageError);
      assert.ok(caught.cause instanceof DOMException);
      assert.equal(caught.cause.name, 'QuotaExceededError');
    });
  }

  private static readonly MUTEX = Mutex.create<string>();

  private static readonly IDENTITY = { 'key': 'errors', 'mutex': StoreErrorsTests.MUTEX };

  private static readonly NUMBER_CODEC = JsonStateCodec.create<unknown>({ 'decode': (value: unknown): unknown => {return value;} });

  private static readonly SYNCHRONOUS_CASES: readonly StoreErrorCaseInterface[] = [
    {
      'code': 'store.stateDecodeFailed',
      'errorClass': StateDecodeError,
      'name': 'malformed serialized state',
      'run': (): unknown => {
        const codec = StoreErrorsTests.NUMBER_CODEC;
        const result = codec.decode('{');
        return result;
      }
    },
    {
      'code': 'store.stateEncodeFailed',
      'errorClass': StateEncodeError,
      'name': 'unserializable bigint state',
      'run': (): unknown => {
        const codec = StoreErrorsTests.NUMBER_CODEC;
        const result = codec.encode(1n);
        return result;
      }
    },
    {
      'code': 'store.stateEncodeFailed',
      'errorClass': StateEncodeError,
      'name': 'non-string serialization result',
      'run': (): unknown => {
        const codec = StoreErrorsTests.NUMBER_CODEC;
        const result = codec.encode(undefined);
        return result;
      }
    },
    {
      'code': 'store.contextStoreInvalidOptions',
      'errorClass': ContextStoreOptionsError,
      'name': 'ContextStore synchronization identity without a mutex',
      'run': (): unknown => {
        const returned = ContextStore.create({
          'context': Context.create({ 'name': 'options' }),
          'createStore': (): StoreInterface<number> => {
            const result = StoreErrorsTests.createCounterStore('errors');
            return result;
          },
          'key': 'errors',
          'synchronizationIdentity': { 'key': 'errors', 'mutex': Object.defineProperty(Mutex.create<string>(), 'runExclusive', { 'value': undefined }) }
        });
        return returned;
      }
    },
    {
      'code': 'store.contextScopeInactive',
      'errorClass': ContextScopeInactiveError,
      'name': 'ContextStore outside an active scope',
      'run': (): unknown => {
        const store = StoreErrorsTests.createContextStore((): StoreInterface<number> => {
          const result = StoreErrorsTests.createCounterStore('errors');
          return result;
        }, Context.create({ 'name': 'inactive' }));
        const returned = store.getSnapshot();
        return returned;
      }
    },
    {
      'code': 'store.contextFactoryInvalid',
      'errorClass': ContextStoreFactoryError,
      'name': 'ContextStore factory returning a non-store',
      'run': (): unknown => {
        const context = Context.create({ 'name': 'factory' });
        const store = StoreErrorsTests.createContextStore((): StoreInterface<number> => {
          const result = Object.defineProperty(StoreErrorsTests.createCounterStore('errors'), 'clear', { 'value': undefined });
          return result;
        }, context);

        const returned = context.initialize().execute((): unknown => {
          const result = store.getSnapshot();
          return result;
        });
        return returned;
      }
    },
    {
      'code': 'store.contextKeyConflict',
      'errorClass': ContextStoreKeyConflictError,
      'name': 'ContextStore key holding a foreign value',
      'run': (): unknown => {
        const context = Context.create({ 'name': 'conflict' });
        const store = StoreErrorsTests.createContextStore((): StoreInterface<number> => {
          const result = StoreErrorsTests.createCounterStore('errors');
          return result;
        }, context);

        const returned = context.initialize({ 'errors': 'foreign' }).execute((): unknown => {
          const result = store.getSnapshot();
          return result;
        });
        return returned;
      }
    },
    {
      'code': 'store.synchronizationIdentityMismatch',
      'errorClass': SynchronizationIdentityMismatchError,
      'name': 'ContextStore backing store with another identity',
      'run': (): unknown => {
        const context = Context.create({ 'name': 'identity' });
        const store = StoreErrorsTests.createContextStore((): StoreInterface<number> => {
          const result = StoreErrorsTests.createCounterStore('other');
          return result;
        }, context);

        const returned = context.initialize().execute((): unknown => {
          const result = store.getSnapshot();
          return result;
        });
        return returned;
      }
    },
    {
      'code': 'store.strataInvalidOptions',
      'errorClass': StrataStoreOptionsError,
      'name': 'StrataStore without layers',
      'run': (): unknown => {
        const result = StrataStore.create({ 'layers': [] });
        return result;
      }
    },
    {
      'code': 'store.strataInvalidOptions',
      'errorClass': StrataStoreOptionsError,
      'name': 'StrataStore with repeated layers',
      'run': (): unknown => {
        const layer = StoreErrorsTests.createCounterStore('strata');

        const result = StrataStore.create({ 'layers': [layer, layer] });
        return result;
      }
    }
  ];

  private static readonly ASYNCHRONOUS_CASES: readonly StoreErrorCaseInterface[] = [
    {
      'code': 'store.mutationFromListener',
      'errorClass': StoreListenerMutationError,
      'name': 'mutation from a listener',
      'run': async (): Promise<void> => {
        const store = StoreErrorsTests.createCounterStore('listener');
        const nested = Promise.withResolvers<unknown>();

        store.subscribe(async (): Promise<void> => {
          await store.setState(2).then(nested.resolve, nested.resolve);
        });
        await store.setState(1);

        const outcome = await nested.promise;

        if (outcome instanceof StoreError) {
          throw outcome;
        }
      }
    },
    {
      'code': 'store.browserStorageFailed',
      'errorClass': BrowserStorageError,
      'name': 'Web Storage write failure',
      'run': async (): Promise<void> => {
        const persistence = BrowserPersistence.create({ 'codec': StoreErrorsTests.NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });

        await persistence.save('key', 1);
      }
    },
    {
      'code': 'store.browserStorageFailed',
      'errorClass': BrowserStorageError,
      'name': 'Web Storage read failure',
      'run': async (): Promise<void> => {
        const persistence = BrowserPersistence.create({ 'codec': StoreErrorsTests.NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.SessionStorage });

        await persistence.load('key');
      }
    },
    {
      'code': 'store.browserStorageFailed',
      'errorClass': BrowserStorageError,
      'name': 'Web Storage remove failure',
      'run': async (): Promise<void> => {
        const persistence = BrowserPersistence.create({ 'codec': StoreErrorsTests.NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });

        await persistence.clear('key');
      }
    },
    {
      'code': 'store.indexedDbInvalidEntry',
      'errorClass': IndexedDbEntryError,
      'name': 'IndexedDB entry that is not a string',
      'run': async (): Promise<void> => {
        await IndexedDbSeed.writeNumber('substrate-store', 'states', 'not-a-string', 42);

        const persistence = BrowserPersistence.create({ 'codec': StoreErrorsTests.NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb });

        await persistence.load('not-a-string');
      }
    }
  ];

  private static createCounterStore(key: string): StoreInterface<number> {
    const result = Store.create({
      'initialState': 0,
      'key': key,
      'mutex': StoreErrorsTests.MUTEX,
      'persistence': MemoryPersistence.create<number>()
    });

    return result;
  }

  private static createContextStore(factory: () => StoreInterface<number>, context: Context): ContextStore<number> {
    const result = ContextStore.create({
      'context': context,
      'createStore': factory,
      'key': 'errors',
      'synchronizationIdentity': StoreErrorsTests.IDENTITY
    });

    return result;
  }

  private static async captureRejection(run: () => unknown): Promise<Error> {
    const error = await ErrorCapture.rejection(Promise.resolve().then(run));
    return error;
  }

  private static assertStoreError(caught: Error, errorCase: StoreErrorCaseInterface): void {
    assert.ok(caught instanceof errorCase.errorClass, `${errorCase.name} throws ${errorCase.errorClass.name}`);
    assert.ok(caught instanceof StoreError);
    assert.equal(caught.name, errorCase.errorClass.name);
    assert.equal(caught.code, errorCase.code);
  }
}

void describe('Store errors', () => {
  StoreErrorsTests.declaresGroup1();
});
