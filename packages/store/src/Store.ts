import { Mutex } from '@studnicky/mutex';

import type { StatePersistenceInterface } from './interfaces/StatePersistenceInterface.js';
import type { StoreInterface } from './interfaces/StoreInterface.js';
import type { StoreListenerInterface } from './interfaces/StoreListenerInterface.js';
import type { StoreOptionsInterface } from './interfaces/StoreOptionsInterface.js';

export class Store<TState> implements StoreInterface<TState> {
  readonly #initialState: TState;
  readonly #key: string;
  readonly #listeners = new Set<StoreListenerInterface<TState>>();
  readonly #mutex = Mutex.create();
  readonly #persistence: StatePersistenceInterface<TState>;
  #notifying = false;
  #state: TState;

  public static create<TState>(options: StoreOptionsInterface<TState>): Store<TState> {
    const result = new Store(options);

    return result;
  }

  protected constructor(options: StoreOptionsInterface<TState>) {
    this.#initialState = options.initialState;
    this.#key = options.key;
    this.#persistence = options.persistence;
    this.#state = options.initialState;
  }

  public async clear(): Promise<void> {
    this.#throwIfNotifying();
    await this.#mutex.runExclusive(this.#key, async () => {
      await this.#persistence.clear(this.#key);
      await this.#commit(this.#initialState);
    });
  }

  public getSnapshot(): TState {
    const result = this.#state;

    return result;
  }

  public async hydrate(): Promise<void> {
    this.#throwIfNotifying();
    await this.#mutex.runExclusive(this.#key, async () => {
      const persisted = await this.#persistence.load(this.#key);

      if (persisted !== undefined) {
        await this.#commit(persisted);
      }
    });
  }

  public async setState(state: TState): Promise<void> {
    this.#throwIfNotifying();
    await this.#mutex.runExclusive(this.#key, async () => {
      await this.#persistAndCommit(state);
    });
  }

  public subscribe(listener: StoreListenerInterface<TState>): () => void {
    this.#listeners.add(listener);

    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  public async update(updater: (snapshot: TState) => TState): Promise<void> {
    this.#throwIfNotifying();
    await this.#mutex.runExclusive(this.#key, async () => {
      const next = updater(this.#state);

      await this.#persistAndCommit(next);
    });
  }

  async #commit(state: TState): Promise<void> {
    if (Object.is(this.#state, state)) {
      return;
    }

    this.#state = state;
    const listeners = Array.from(this.#listeners);
    this.#notifying = true;
    try {
      const notifications = listeners.map(async (listener): Promise<void> => {
        await listener(state);
      });

      await Promise.all(notifications);
    } finally {
      this.#notifying = false;
    }
  }

  async #persistAndCommit(state: TState): Promise<void> {
    await this.#persistence.save(this.#key, state);
    await this.#commit(state);
  }

  #throwIfNotifying(): void {
    if (this.#notifying) {
      throw new Error('Store mutations are not allowed from a Store listener');
    }
  }
}
