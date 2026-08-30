import type { StateCodecInterface } from '../interfaces/StateCodecInterface.js';
import type { StatePersistenceInterface } from '../interfaces/StatePersistenceInterface.js';
import type { BrowserPersistenceOptionsInterface } from './BrowserPersistenceOptionsInterface.js';
import type { BrowserStorageInterface } from './BrowserStorageInterface.js';

import { BrowserPersistenceOptionsEntity } from '../entities/BrowserPersistenceOptionsEntity.js';
import { StorageTarget } from './StorageTarget.js';

class IndexedDbTransactionCompletion {
  readonly #transaction: IDBTransaction;

  public constructor(transaction: IDBTransaction) {
    this.#transaction = transaction;
  }

  public async wait(): Promise<void> {
    await new Promise<void>((resolve, reject): void => {
      this.#transaction.addEventListener('abort', (): void => {
        reject(this.#transaction.error ?? new Error('IndexedDB transaction aborted'));
      }, { 'once': true });
      this.#transaction.addEventListener('complete', (): void => {
        resolve();
      }, { 'once': true });
      this.#transaction.addEventListener('error', (): void => {
        reject(this.#transaction.error ?? new Error('IndexedDB transaction failed'));
      }, { 'once': true });
    });
  }
}

export class BrowserPersistence<TState> implements StatePersistenceInterface<TState> {
  readonly #codec: StateCodecInterface<TState>;
  readonly #databaseName = 'substrate-store';
  readonly #memory = new Map<string, string>();
  readonly #storage: BrowserStorageInterface | undefined;
  readonly #storeName = 'states';
  readonly #storageTarget: BrowserPersistenceOptionsEntity.Type['storageTarget'];
  #database: Promise<IDBDatabase> | undefined;

  public static create<TState>(options: BrowserPersistenceOptionsInterface<TState>): BrowserPersistence<TState> {
    const normalizedOptions = BrowserPersistenceOptionsEntity.intake({ 'storageTarget': options.storageTarget });
    const result = new BrowserPersistence({
      ...options,
      'storageTarget': normalizedOptions.storageTarget
    });

    return result;
  }

  protected constructor(options: BrowserPersistenceOptionsInterface<TState>) {
    this.#codec = options.codec;
    this.#storage = options.storage;
    this.#storageTarget = options.storageTarget;
  }

  public async clear(key: string): Promise<void> {
    if (this.#storageTarget === StorageTarget.Memory) {
      this.#memory.delete(key);

      return;
    }

    if (this.#storageTarget !== StorageTarget.IndexedDb) {
      this.#getStorage().removeItem(key);

      return;
    }

    const database = await this.#getDatabase();

    await this.#deleteFromDatabase(database, key);
  }

  public async load(key: string): Promise<TState | undefined> {
    const serialized = await this.#loadSerialized(key);

    if (serialized === undefined) {
      return undefined;
    }

    const result = this.#codec.decode(serialized);

    return result;
  }

  public async save(key: string, state: TState): Promise<void> {
    const serialized = this.#codec.encode(state);

    if (this.#storageTarget === StorageTarget.Memory) {
      this.#memory.set(key, serialized);

      return;
    }

    if (this.#storageTarget !== StorageTarget.IndexedDb) {
      this.#getStorage().setItem(key, serialized);

      return;
    }

    const database = await this.#getDatabase();

    await this.#saveToDatabase(database, key, serialized);
  }

  async #deleteFromDatabase(database: IDBDatabase, key: string): Promise<void> {
    const transaction = database.transaction(this.#storeName, 'readwrite');

    transaction.objectStore(this.#storeName).delete(key);
    await new IndexedDbTransactionCompletion(transaction).wait();
  }

  async #getDatabase(): Promise<IDBDatabase> {
    if (this.#database === undefined) {
      this.#database = this.#openDatabase();
    }

    const result = await this.#database;

    return result;
  }

  #getStorage(): BrowserStorageInterface {
    if (this.#storage !== undefined) {
      return this.#storage;
    }

    const storage = this.#storageTarget === StorageTarget.LocalStorage
      ? globalThis.localStorage
      : globalThis.sessionStorage;
    const result: BrowserStorageInterface = storage;

    return result;
  }

  async #loadFromDatabase(database: IDBDatabase, key: string): Promise<string | undefined> {
    const transaction = database.transaction(this.#storeName, 'readonly');
    const request = transaction.objectStore(this.#storeName).get(key);
    const result = await new Promise<string | undefined>((resolve, reject): void => {
      request.addEventListener('error', (): void => {
        reject(request.error ?? new Error('IndexedDB read failed'));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        const value: unknown = request.result;

        if (value === undefined) {
          resolve(undefined);

          return;
        }
        if (typeof value !== 'string') {
          reject(new Error('IndexedDB state entries must be serialized strings'));

          return;
        }
        resolve(value);
      }, { 'once': true });
    });

    await new IndexedDbTransactionCompletion(transaction).wait();

    return result;
  }

  async #loadSerialized(key: string): Promise<string | undefined> {
    if (this.#storageTarget === StorageTarget.Memory) {
      const result = this.#memory.get(key);

      return result;
    }

    if (this.#storageTarget !== StorageTarget.IndexedDb) {
      const serialized = this.#getStorage().getItem(key);
      const result = serialized ?? undefined;

      return result;
    }

    const database = await this.#getDatabase();
    const result = await this.#loadFromDatabase(database, key);

    return result;
  }

  async #openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is unavailable in this runtime');
    }

    const result = await new Promise<IDBDatabase>((resolve, reject): void => {
      const request = indexedDB.open(this.#databaseName);

      request.addEventListener('error', (): void => {
        reject(request.error ?? new Error('IndexedDB open failed'));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        resolve(request.result);
      }, { 'once': true });
      request.addEventListener('upgradeneeded', (): void => {
        const database = request.result;

        if (!database.objectStoreNames.contains(this.#storeName)) {
          database.createObjectStore(this.#storeName);
        }
      }, { 'once': true });
    });
    result.addEventListener('versionchange', (): void => {
      result.close();
      this.#database = undefined;
    });

    return result;
  }

  async #saveToDatabase(database: IDBDatabase, key: string, serialized: string): Promise<void> {
    const transaction = database.transaction(this.#storeName, 'readwrite');

    transaction.objectStore(this.#storeName).put(serialized, key);
    await new IndexedDbTransactionCompletion(transaction).wait();
  }
}
