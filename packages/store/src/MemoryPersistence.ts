import type { StatePersistenceInterface } from './interfaces/StatePersistenceInterface.js';

export class MemoryPersistence<TState> implements StatePersistenceInterface<TState> {
  readonly #states = new Map<string, TState>();

  public static create<TState>(): MemoryPersistence<TState> {
    const result = new MemoryPersistence<TState>();

    return result;
  }

  protected constructor() {}

  public async clear(key: string): Promise<void> {
    await Promise.resolve();
    this.#states.delete(key);
  }

  public async load(key: string): Promise<TState | undefined> {
    await Promise.resolve();

    const result = this.#states.get(key);

    return result;
  }

  public async save(key: string, state: TState): Promise<void> {
    await Promise.resolve();
    this.#states.set(key, state);
  }
}
