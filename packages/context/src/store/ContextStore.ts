import type { StoreInterface, StoreListenerInterface, StoreSynchronizationIdentityInterface } from '@studnicky/store/interfaces';

import { Clone, ImmutableSnapshot } from '#runtime';

import type { ContextStoreOptionsInterface } from './interfaces/ContextStoreOptionsInterface.js';

import { ContextScopeInactiveError } from './errors/ContextScopeInactiveError.js';
import { ContextStoreFactoryError } from './errors/ContextStoreFactoryError.js';
import { ContextStoreKeyConflictError } from './errors/ContextStoreKeyConflictError.js';
import { ContextStoreOptionsError } from './errors/ContextStoreOptionsError.js';
import { SynchronizationIdentityMismatchError } from './errors/SynchronizationIdentityMismatchError.js';

class ContextStoreValue {
  static hasFunction(value: object, name: string): boolean {
    let candidate: object | null = value;

    while (candidate !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, name);
      if (descriptor !== undefined) {
        const result = typeof descriptor.value === 'function';

        return result;
      }
      candidate = Reflect.getPrototypeOf(candidate);
    }

    return false;
  }

  static isStoreInterface(value: object): value is StoreInterface<unknown> {
    const result = ContextStoreValue.hasFunction(value, 'clear')
      && ContextStoreValue.hasFunction(value, 'getSnapshot')
      && ContextStoreValue.hasFunction(value, 'getSynchronizationIdentity')
      && ContextStoreValue.hasFunction(value, 'hydrate')
      && ContextStoreValue.hasFunction(value, 'setState')
      && ContextStoreValue.hasFunction(value, 'subscribe')
      && ContextStoreValue.hasFunction(value, 'update');

    return result;
  }

  static snapshotSynchronizationIdentity(identity: StoreSynchronizationIdentityInterface): StoreSynchronizationIdentityInterface {
    const key = identity.key;
    const mutex = identity.mutex;

    if (typeof key !== 'string' || mutex === null || typeof mutex !== 'object' || !ContextStoreValue.hasFunction(mutex, 'runExclusive')) {
      throw new ContextStoreOptionsError('ContextStore synchronizationIdentity must contain a string key and MutexInterface');
    }

    const result = { 'key': key, 'mutex': mutex };

    return result;
  }
}

/**
 * Resolves one backing Store per active Context scope.
 */
export class ContextStore<TState> implements StoreInterface<TState> {
  readonly #backingStores = new WeakSet<object>();
  readonly #ownedStores = new WeakMap<object, StoreInterface<TState>>();
  readonly #context: ContextStoreOptionsInterface<TState>['context'];
  readonly #createStore: ContextStoreOptionsInterface<TState>['createStore'];
  readonly #key: string;
  readonly #listeners = new Set<StoreListenerInterface<TState>>();
  readonly #synchronizationIdentity: StoreSynchronizationIdentityInterface;

  public static create<TState>(options: ContextStoreOptionsInterface<TState>): ContextStore<TState> {
    const result = new ContextStore(options);

    return result;
  }

  protected constructor(options: ContextStoreOptionsInterface<TState>) {
    if (typeof options.createStore !== 'function') {
      throw new ContextStoreOptionsError('ContextStore createStore must be a function');
    }
    if (typeof options.key !== 'string') {
      throw new ContextStoreOptionsError('ContextStore key must be a string');
    }

    this.#context = options.context;
    this.#createStore = options.createStore;
    this.#key = options.key;
    this.#synchronizationIdentity = ContextStoreValue.snapshotSynchronizationIdentity(options.synchronizationIdentity);
  }

  public clear(): Promise<void> {
    const result = this.#getStore().clear();

    return result;
  }

  public getSnapshot(): TState {
    const result = ImmutableSnapshot.from(this.#getStore().getSnapshot());

    return result;
  }

  public getSynchronizationIdentity(): StoreSynchronizationIdentityInterface {
    const result = { 'key': this.#synchronizationIdentity.key, 'mutex': this.#synchronizationIdentity.mutex };

    return result;
  }

  public hydrate(): Promise<void> {
    const result = this.#getStore().hydrate();

    return result;
  }

  public setState(state: TState): Promise<void> {
    const result = this.#getStore().setState(Clone.deep(state));

    return result;
  }

  public subscribe(listener: StoreListenerInterface<TState>): () => void {
    this.#listeners.add(listener);

    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  public update(updater: (snapshot: TState) => TState): Promise<void> {
    const result = this.#getStore().update((snapshot: TState): TState => {
      const next = updater(ImmutableSnapshot.from(snapshot));
      const detached = Clone.deep(next);

      return detached;
    });

    return result;
  }

  #attachBackingStore(store: StoreInterface<TState>): void {
    if (this.#backingStores.has(store)) {
      return;
    }

    this.#backingStores.add(store);
    store.subscribe(async (snapshot): Promise<void> => {
      await this.#notify(snapshot);
    });
  }

  #assertSynchronizationIdentity(store: StoreInterface<TState>): void {
    const identity = store.getSynchronizationIdentity();

    if (identity.key !== this.#synchronizationIdentity.key || identity.mutex !== this.#synchronizationIdentity.mutex) {
      throw new SynchronizationIdentityMismatchError();
    }
  }

  #getStore(): StoreInterface<TState> {
    if (!this.#context.isActive()) {
      throw new ContextScopeInactiveError();
    }

    const lookup = this.#context.tryGet(this.#key);
    if (lookup.found && lookup.value !== null && typeof lookup.value === 'object') {
      const owned = this.#ownedStores.get(lookup.value);
      if (owned !== undefined) {
        this.#assertSynchronizationIdentity(owned);
        this.#attachBackingStore(owned);

        return owned;
      }
    }

    if (lookup.found) {
      throw new ContextStoreKeyConflictError(this.#key);
    }

    const store = this.#createStore();
    if (!ContextStoreValue.isStoreInterface(store)) {
      throw new ContextStoreFactoryError();
    }

    this.#assertSynchronizationIdentity(store);
    this.#ownedStores.set(store, store);
    this.#context.set(this.#key, store);
    this.#attachBackingStore(store);

    return store;
  }

  async #notify(snapshot: TState): Promise<void> {
    const listeners = Array.from(this.#listeners);
    const notifications = listeners.map(async (listener): Promise<void> => {
      await listener(ImmutableSnapshot.from(snapshot));
    });

    await Promise.all(notifications);
  }
}
