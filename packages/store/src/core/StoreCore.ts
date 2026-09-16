import type { MutexInterface } from '@studnicky/mutex/interfaces';

import { Clone, ImmutableSnapshot } from '@studnicky/json/browser';

import type { StatePersistenceInterface } from '../interfaces/StatePersistenceInterface.js';
import type { StoreInterface } from '../interfaces/StoreInterface.js';
import type { StoreListenerInterface } from '../interfaces/StoreListenerInterface.js';
import type { StoreOptionsInterface } from '../interfaces/StoreOptionsInterface.js';
import type { StoreSynchronizationIdentityInterface } from '../interfaces/StoreSynchronizationIdentityInterface.js';

export class StoreCore<TState> implements StoreInterface<TState> {
  readonly #initialState: TState;
  readonly #key: string;
  readonly #listeners = new Set<StoreListenerInterface<TState>>();
  readonly #mutex: MutexInterface<string>;
  readonly #persistence: StatePersistenceInterface<TState>;
  #notifying = false;
  #state: TState;

  protected constructor(options: StoreOptionsInterface<TState>, mutex: MutexInterface<string>) {
    this.#initialState = Clone.deep(options.initialState);
    this.#key = options.key;
    this.#mutex = mutex;
    this.#persistence = options.persistence;
    this.#state = this.#initialState;
  }

  public async clear(): Promise<void> {
    this.#throwIfNotifying();
    await this.#mutex.runExclusive(this.#key, async () => {
      await this.#persistence.clear(this.#key);
      await this.#commit(this.#initialState);
    });
  }

  public getSnapshot(): TState {
    const result = ImmutableSnapshot.from(this.#state);

    return result;
  }

  public getSynchronizationIdentity(): StoreSynchronizationIdentityInterface {
    const result = { 'key': this.#key, 'mutex': this.#mutex };

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
      const next = updater(ImmutableSnapshot.from(this.#state));

      await this.#persistAndCommit(next);
    });
  }

  async #commit(state: TState): Promise<void> {
    if (Object.is(this.#state, state)) {
      return;
    }

    this.#state = Clone.deep(state);
    const listeners = Array.from(this.#listeners);
    this.#notifying = true;
    try {
      const notifications = listeners.map(async (listener): Promise<void> => {
        await listener(ImmutableSnapshot.from(this.#state));
      });

      await Promise.all(notifications);
    } finally {
      this.#notifying = false;
    }
  }

  async #persistAndCommit(state: TState): Promise<void> {
    const detached = Clone.deep(state);
    await this.#persistence.save(this.#key, Clone.deep(detached));
    await this.#commit(detached);
  }

  #throwIfNotifying(): void {
    if (this.#notifying) {
      throw new Error('Store mutations are not allowed from a Store listener');
    }
  }
}
