import type { ContextStoreOptionsInterface } from '../interfaces/ContextStoreOptionsInterface.js';
import type { StoreInterface } from '../interfaces/StoreInterface.js';
import type { StoreListenerInterface } from '../interfaces/StoreListenerInterface.js';

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

  static isStoreInterface<TState>(value: object): value is StoreInterface<TState> {
    const result = ContextStoreValue.hasFunction(value, 'clear')
      && ContextStoreValue.hasFunction(value, 'getSnapshot')
      && ContextStoreValue.hasFunction(value, 'hydrate')
      && ContextStoreValue.hasFunction(value, 'setState')
      && ContextStoreValue.hasFunction(value, 'subscribe')
      && ContextStoreValue.hasFunction(value, 'update');

    return result;
  }
}

/**
 * Resolves one backing Store per active Context scope.
 */
export class ContextStore<TState> implements StoreInterface<TState> {
  readonly #context: ContextStoreOptionsInterface<TState>['context'];
  readonly #createStore: ContextStoreOptionsInterface<TState>['createStore'];
  readonly #key: string;

  public static create<TState>(options: ContextStoreOptionsInterface<TState>): ContextStore<TState> {
    const result = new ContextStore(options);

    return result;
  }

  protected constructor(options: ContextStoreOptionsInterface<TState>) {
    this.#context = options.context;
    this.#createStore = options.createStore;
    this.#key = options.key;
  }

  public clear(): Promise<void> {
    const result = this.#getStore().clear();

    return result;
  }

  public getSnapshot(): TState {
    const result = this.#getStore().getSnapshot();

    return result;
  }

  public hydrate(): Promise<void> {
    const result = this.#getStore().hydrate();

    return result;
  }

  public setState(state: TState): Promise<void> {
    const result = this.#getStore().setState(state);

    return result;
  }

  public subscribe(listener: StoreListenerInterface<TState>): () => void {
    const result = this.#getStore().subscribe(listener);

    return result;
  }

  public update(updater: (snapshot: TState) => TState): Promise<void> {
    const result = this.#getStore().update(updater);

    return result;
  }

  #getStore(): StoreInterface<TState> {
    if (!this.#context.isActive()) {
      throw new Error('ContextStore requires an active Context scope');
    }

    const lookup = this.#context.tryGet(this.#key);
    if (lookup.found && lookup.value !== null && typeof lookup.value === 'object'
      && ContextStoreValue.isStoreInterface<TState>(lookup.value)) {
      return lookup.value;
    }

    if (lookup.found) {
      throw new Error(`ContextStore key ${this.#key} does not contain a StoreInterface`);
    }

    const store = this.#createStore();
    if (!ContextStoreValue.isStoreInterface<TState>(store)) {
      throw new Error('ContextStore factory must return a StoreInterface');
    }

    this.#context.set(this.#key, store);

    return store;
  }
}
