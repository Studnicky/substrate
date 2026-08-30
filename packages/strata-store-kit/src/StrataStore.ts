import type {
  StoreInterface, StoreListenerInterface
} from '@studnicky/store/interfaces';

import { Mutex } from '@studnicky/mutex';

import type { StrataStoreOptionsInterface } from './interfaces/StrataStoreOptionsInterface.js';

export class StrataStore<TState> implements StoreInterface<TState> {
  readonly #mutex = Mutex.create<symbol>();
  readonly #mutexKey = Symbol('strataStore');
  readonly #stores: readonly StoreInterface<TState>[];
  readonly #unsubscribers: readonly (() => void)[];

  public static create<TState>(options: StrataStoreOptionsInterface<TState>): StrataStore<TState> {
    const result = new StrataStore(options);

    return result;
  }

  protected constructor(options: StrataStoreOptionsInterface<TState>) {
    if (options.layers.length === 0) {
      throw new Error('StrataStore requires at least one store');
    }
    if (new Set(options.layers).size !== options.layers.length) {
      throw new Error('StrataStore requires unique store layers');
    }

    this.#stores = Array.from(options.layers);
    this.#unsubscribers = StrataStore.#connectStores(this.#stores);
  }

  static #connectStores<TValue>(stores: readonly StoreInterface<TValue>[]): readonly (() => void)[] {
    const unsubscribers: (() => void)[] = [];
    const lastSourceIndex = stores.length - 1;

    for (let index = 0; index < lastSourceIndex; index += 1) {
      const source = stores[index];
      const target = stores[index + 1];

      if (source === undefined || target === undefined) {
        throw new Error('StrataStore cannot connect an undefined store');
      }

      const unsubscribe = source.subscribe(async (snapshot): Promise<void> => {
        await target.setState(snapshot);
      });

      unsubscribers.push(unsubscribe);
    }

    const result = unsubscribers;

    return result;
  }

  public async clear(): Promise<void> {
    await this.#mutex.runExclusive(this.#mutexKey, async (): Promise<void> => {
      const count = this.#stores.length;

      for (let index = 0; index < count; index += 1) {
        const store = this.#stores[index];

        if (store === undefined) {
          throw new Error('StrataStore cannot clear an undefined store');
        }

        await store.clear();
      }
    });
  }

  public dispose(): void {
    const count = this.#unsubscribers.length;

    for (let index = 0; index < count; index += 1) {
      const unsubscribe = this.#unsubscribers[index];

      if (unsubscribe === undefined) {
        continue;
      }

      unsubscribe();
    }
  }

  public getSnapshot(): TState {
    const result = this.#target().getSnapshot();

    return result;
  }

  public async hydrate(): Promise<void> {
    await this.#mutex.runExclusive(this.#mutexKey, async (): Promise<void> => {
      const target = this.#target();

      await target.hydrate();
      const source = this.#source();

      await source.setState(target.getSnapshot());
    });
  }

  public async setState(state: TState): Promise<void> {
    await this.#mutex.runExclusive(this.#mutexKey, async (): Promise<void> => {
      const source = this.#source();

      await source.setState(state);
    });
  }

  public subscribe(listener: StoreListenerInterface<TState>): () => void {
    const result = this.#target().subscribe(listener);

    return result;
  }

  public async update(updater: (snapshot: TState) => TState): Promise<void> {
    await this.#mutex.runExclusive(this.#mutexKey, async (): Promise<void> => {
      const source = this.#source();

      await source.update(updater);
    });
  }

  #source(): StoreInterface<TState> {
    const [source] = this.#stores;

    if (source === undefined) {
      throw new Error('StrataStore source is unavailable');
    }

    return source;
  }

  #target(): StoreInterface<TState> {
    const target = this.#stores.at(-1);

    if (target === undefined) {
      throw new Error('StrataStore target is unavailable');
    }

    return target;
  }
}
