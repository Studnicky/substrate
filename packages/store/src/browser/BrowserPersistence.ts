
import { Clone } from '#runtime';

import type { StateCodecInterface } from '../interfaces/StateCodecInterface.js';
import type { StatePersistenceInterface } from '../interfaces/StatePersistenceInterface.js';
import type { BrowserPersistenceOptionsInterface } from './BrowserPersistenceOptionsInterface.js';
import type { BrowserStorageInterface } from './BrowserStorageInterface.js';

import { BrowserPersistenceOptionsEntity } from '../entities/BrowserPersistenceOptionsEntity.js';
import { BrowserStorageError } from '../errors/BrowserStorageError.js';
import { IndexedDbEntryError } from '../errors/IndexedDbEntryError.js';
import { IndexedDbError } from '../errors/IndexedDbError.js';
import { IndexedDbUnavailableError } from '../errors/IndexedDbUnavailableError.js';
import { StorageTarget } from './StorageTarget.js';

class IndexedDbTransactionCompletion {
  readonly #transaction: IDBTransaction;

  public constructor(transaction: IDBTransaction) {
    this.#transaction = transaction;
  }

  public async wait(): Promise<void> {
    await new Promise<void>((resolve, reject): void => {
      this.#transaction.addEventListener('abort', (): void => {
        reject(new IndexedDbError('IndexedDB transaction aborted', this.#transaction.error ?? undefined));
      }, { 'once': true });
      this.#transaction.addEventListener('complete', (): void => {
        resolve();
      }, { 'once': true });
      this.#transaction.addEventListener('error', (): void => {
        reject(new IndexedDbError('IndexedDB transaction failed', this.#transaction.error ?? undefined));
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
      this.#removeStoredItem(key);

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

    const result = Clone.deep(this.#codec.decode(serialized));

    return result;
  }

  public async save(key: string, state: TState): Promise<void> {
    const serialized = this.#codec.encode(Clone.deep(state));

    if (this.#storageTarget === StorageTarget.Memory) {
      this.#memory.set(key, serialized);

      return;
    }

    if (this.#storageTarget !== StorageTarget.IndexedDb) {
      this.#setStoredItem(key, serialized);

      return;
    }

    const database = await this.#getDatabase();

    await this.#saveToDatabase(database, key, serialized);
  }

  async #deleteFromDatabase(database: IDBDatabase, key: string): Promise<void> {
    let transaction: IDBTransaction;

    try {
      transaction = database.transaction(this.#storeName, 'readwrite');
      transaction.objectStore(this.#storeName).delete(key);
    } catch (cause) {
      throw new IndexedDbError('IndexedDB delete failed', cause);
    }

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

    const name = this.#storageTarget === StorageTarget.LocalStorage ? 'localStorage' : 'sessionStorage';
    let resolved: BrowserStorageInterface | undefined;

    try {
      resolved = name === 'localStorage' ? globalThis.localStorage : globalThis.sessionStorage;
    } catch (cause) {
      throw new BrowserStorageError(`${name} access failed`, cause);
    }

    if (resolved !== undefined) {
      return resolved;
    }

    throw new BrowserStorageError(`${name} is unavailable in this runtime`);
  }

  #removeStoredItem(key: string): void {
    const storage = this.#getStorage();

    try {
      storage.removeItem(key);
    } catch (cause) {
      throw new BrowserStorageError('Web Storage removeItem failed', cause);
    }
  }

  #setStoredItem(key: string, serialized: string): void {
    const storage = this.#getStorage();

    try {
      storage.setItem(key, serialized);
    } catch (cause) {
      throw new BrowserStorageError('Web Storage setItem failed', cause);
    }
  }

  async #loadFromDatabase(database: IDBDatabase, key: string): Promise<string | undefined> {
    let request: IDBRequest;
    let transaction: IDBTransaction;

    try {
      transaction = database.transaction(this.#storeName, 'readonly');
      request = transaction.objectStore(this.#storeName).get(key);
    } catch (cause) {
      throw new IndexedDbError('IndexedDB read failed', cause);
    }

    const result = await new Promise<string | undefined>((resolve, reject): void => {
      request.addEventListener('error', (): void => {
        reject(new IndexedDbError('IndexedDB read failed', request.error ?? undefined));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        const value: unknown = request.result;

        if (value === undefined) {
          resolve(undefined);

          return;
        }
        if (typeof value !== 'string') {
          reject(new IndexedDbEntryError());

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
      const storage = this.#getStorage();
      let serialized: string | null;

      try {
        serialized = storage.getItem(key);
      } catch (cause) {
        throw new BrowserStorageError('Web Storage getItem failed', cause);
      }

      const result = serialized ?? undefined;

      return result;
    }

    const database = await this.#getDatabase();
    const result = await this.#loadFromDatabase(database, key);

    return result;
  }

  async #openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      throw new IndexedDbUnavailableError();
    }

    const result = await new Promise<IDBDatabase>((resolve, reject): void => {
      let request: IDBOpenDBRequest;

      try {
        request = indexedDB.open(this.#databaseName);
      } catch (cause) {
        reject(new IndexedDbError('IndexedDB open failed', cause));

        return;
      }

      request.addEventListener('error', (): void => {
        reject(new IndexedDbError('IndexedDB open failed', request.error ?? undefined));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        resolve(request.result);
      }, { 'once': true });
      request.addEventListener('upgradeneeded', (): void => {
        const database = request.result;

        try {
          if (!database.objectStoreNames.contains(this.#storeName)) {
            database.createObjectStore(this.#storeName);
          }
        } catch (cause) {
          reject(new IndexedDbError('IndexedDB upgrade failed', cause));
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
    let transaction: IDBTransaction;

    try {
      transaction = database.transaction(this.#storeName, 'readwrite');
      transaction.objectStore(this.#storeName).put(serialized, key);
    } catch (cause) {
      throw new IndexedDbError('IndexedDB write failed', cause);
    }

    await new IndexedDbTransactionCompletion(transaction).wait();
  }
}
