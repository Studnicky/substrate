import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Context } from '@studnicky/context/node';
import { Mutex } from '@studnicky/mutex/node';
import 'fake-indexeddb/auto';

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

interface StoreErrorCaseInterface {
  readonly 'code': string;
  readonly 'errorClass': abstract new (...argumentList: never[]) => StoreError;
  readonly 'name': string;
  readonly 'run': () => unknown;
}

const MUTEX = Mutex.create<string>();
const IDENTITY = { 'key': 'errors', 'mutex': MUTEX };

class FailingStorage implements BrowserStorageInterface {
  public getItem(): string | null {
    throw new DOMException('read denied', 'SecurityError');
  }

  public removeItem(): void {
    throw new DOMException('remove denied', 'SecurityError');
  }

  public setItem(): void {
    throw new DOMException('quota exceeded', 'QuotaExceededError');
  }
}

const NUMBER_CODEC = JsonStateCodec.create<unknown>({ 'decode': (value: unknown): unknown => value });

function createCounterStore(key: string): StoreInterface<number> {
  const result = Store.create({
    'initialState': 0,
    'key': key,
    'mutex': MUTEX,
    'persistence': MemoryPersistence.create<number>()
  });

  return result;
}

function createContextStore(factory: () => StoreInterface<number>, context: Context): ContextStore<number> {
  const result = ContextStore.create({
    'context': context,
    'createStore': factory,
    'key': 'errors',
    'synchronizationIdentity': IDENTITY
  });

  return result;
}

const SYNCHRONOUS_CASES: readonly StoreErrorCaseInterface[] = [
  {
    'code': 'store.stateDecodeFailed',
    'errorClass': StateDecodeError,
    'name': 'malformed serialized state',
    'run': (): unknown => NUMBER_CODEC.decode('{')
  },
  {
    'code': 'store.stateEncodeFailed',
    'errorClass': StateEncodeError,
    'name': 'unserializable bigint state',
    'run': (): unknown => NUMBER_CODEC.encode(1n)
  },
  {
    'code': 'store.stateEncodeFailed',
    'errorClass': StateEncodeError,
    'name': 'non-string serialization result',
    'run': (): unknown => NUMBER_CODEC.encode(undefined)
  },
  {
    'code': 'store.contextStoreInvalidOptions',
    'errorClass': ContextStoreOptionsError,
    'name': 'ContextStore synchronization identity without a mutex',
    'run': (): unknown => ContextStore.create({
      'context': Context.create({ 'name': 'options' }),
      'createStore': (): StoreInterface<number> => createCounterStore('errors'),
      'key': 'errors',
      'synchronizationIdentity': { 'key': 'errors', 'mutex': Object.create(null) }
    })
  },
  {
    'code': 'store.contextScopeInactive',
    'errorClass': ContextScopeInactiveError,
    'name': 'ContextStore outside an active scope',
    'run': (): unknown => createContextStore((): StoreInterface<number> => createCounterStore('errors'), Context.create({ 'name': 'inactive' })).getSnapshot()
  },
  {
    'code': 'store.contextFactoryInvalid',
    'errorClass': ContextStoreFactoryError,
    'name': 'ContextStore factory returning a non-store',
    'run': (): unknown => {
      const context = Context.create({ 'name': 'factory' });
      const store = createContextStore((): StoreInterface<number> => Object.create(null), context);

      return context.initialize().execute((): unknown => store.getSnapshot());
    }
  },
  {
    'code': 'store.contextKeyConflict',
    'errorClass': ContextStoreKeyConflictError,
    'name': 'ContextStore key holding a foreign value',
    'run': (): unknown => {
      const context = Context.create({ 'name': 'conflict' });
      const store = createContextStore((): StoreInterface<number> => createCounterStore('errors'), context);

      return context.initialize({ 'errors': 'foreign' }).execute((): unknown => store.getSnapshot());
    }
  },
  {
    'code': 'store.synchronizationIdentityMismatch',
    'errorClass': SynchronizationIdentityMismatchError,
    'name': 'ContextStore backing store with another identity',
    'run': (): unknown => {
      const context = Context.create({ 'name': 'identity' });
      const store = createContextStore((): StoreInterface<number> => createCounterStore('other'), context);

      return context.initialize().execute((): unknown => store.getSnapshot());
    }
  },
  {
    'code': 'store.strataInvalidOptions',
    'errorClass': StrataStoreOptionsError,
    'name': 'StrataStore without layers',
    'run': (): unknown => StrataStore.create({ 'layers': [] })
  },
  {
    'code': 'store.strataInvalidOptions',
    'errorClass': StrataStoreOptionsError,
    'name': 'StrataStore with repeated layers',
    'run': (): unknown => {
      const layer = createCounterStore('strata');

      return StrataStore.create({ 'layers': [layer, layer] });
    }
  }
];

const ASYNCHRONOUS_CASES: readonly StoreErrorCaseInterface[] = [
  {
    'code': 'store.mutationFromListener',
    'errorClass': StoreListenerMutationError,
    'name': 'mutation from a listener',
    'run': async (): Promise<void> => {
      const store = createCounterStore('listener');
      const nested = Promise.withResolvers<unknown>();

      store.subscribe(async (): Promise<void> => {
        await store.setState(2).then(nested.resolve, nested.resolve);
      });
      await store.setState(1);

      const outcome = await nested.promise;

      if (outcome instanceof Error) {
        throw outcome;
      }
    }
  },
  {
    'code': 'store.browserStorageFailed',
    'errorClass': BrowserStorageError,
    'name': 'Web Storage write failure',
    'run': async (): Promise<void> => {
      const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });

      await persistence.save('key', 1);
    }
  },
  {
    'code': 'store.browserStorageFailed',
    'errorClass': BrowserStorageError,
    'name': 'Web Storage read failure',
    'run': async (): Promise<void> => {
      const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.SessionStorage });

      await persistence.load('key');
    }
  },
  {
    'code': 'store.browserStorageFailed',
    'errorClass': BrowserStorageError,
    'name': 'Web Storage remove failure',
    'run': async (): Promise<void> => {
      const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });

      await persistence.clear('key');
    }
  },
  {
    'code': 'store.indexedDbInvalidEntry',
    'errorClass': IndexedDbEntryError,
    'name': 'IndexedDB entry that is not a string',
    'run': async (): Promise<void> => {
      const opened = Promise.withResolvers<IDBDatabase>();
      const request = indexedDB.open('substrate-store');

      request.addEventListener('upgradeneeded', (): void => {
        request.result.createObjectStore('states');
      }, { 'once': true });
      request.addEventListener('success', (): void => { opened.resolve(request.result); }, { 'once': true });
      const database = await opened.promise;
      const written = Promise.withResolvers<void>();
      const transaction = database.transaction('states', 'readwrite');

      transaction.objectStore('states').put(42, 'not-a-string');
      transaction.addEventListener('complete', (): void => { written.resolve(); }, { 'once': true });
      await written.promise;
      database.close();

      const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.IndexedDb });

      await persistence.load('not-a-string');
    }
  }
];

async function captureRejection(run: () => unknown): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }

  return undefined;
}

function assertStoreError(caught: unknown, errorCase: StoreErrorCaseInterface): void {
  assert.ok(caught instanceof errorCase.errorClass, `${errorCase.name} throws ${errorCase.errorClass.name}`);
  assert.ok(caught instanceof StoreError);
  assert.equal(caught.name, errorCase.errorClass.name);
  assert.equal(caught.code, errorCase.code);
}

void describe('Store errors', () => {
  for (const errorCase of [...SYNCHRONOUS_CASES, ...ASYNCHRONOUS_CASES]) {
    void it(`${errorCase.name} surfaces ${errorCase.errorClass.name}`, async () => {
      assertStoreError(await captureRejection(errorCase.run), errorCase);
    });
  }

  void it('keeps the platform SyntaxError as the cause of a decode failure', () => {
    const caught = (() => {
      try {
        NUMBER_CODEC.decode('{');
      } catch (error) {
        return error;
      }

      return undefined;
    })();

    assert.ok(caught instanceof StateDecodeError);
    assert.ok(caught.cause instanceof SyntaxError);
  });

  void it('keeps the platform DOMException as the cause of a Web Storage failure', async () => {
    const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storage': new FailingStorage(), 'storageTarget': StorageTarget.LocalStorage });
    const caught = await captureRejection(async () => persistence.save('key', 1));

    assert.ok(caught instanceof BrowserStorageError);
    assert.ok(caught.cause instanceof DOMException);
    assert.equal(caught.cause.name, 'QuotaExceededError');
  });
});
