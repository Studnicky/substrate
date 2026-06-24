/** Keyed async coalescing: concurrent calls for the same key share one in-flight promise. */

import { CoalesceBuilder } from './CoalesceBuilder.js';

export class Coalesce<T> {
  static builder<T>(): CoalesceBuilder<T> {
    const result = CoalesceBuilder.create<T>(() => {
      const coalesce = Coalesce.create<T>();
      return coalesce;
    });
    return result;
  }

  static create<T>(): Coalesce<T> {
    const result = new (this as unknown as new () => Coalesce<T>)();
    return result;
  }

  readonly #inFlight = new Map<string, Promise<T>>();

  protected constructor() {
    // no-op
  }

  async run(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.#inFlight.get(key);
    if (existing !== undefined) { return await existing; }

    const started = factory().finally(() => {
      this.#inFlight.delete(key);
    });
    this.#inFlight.set(key, started);
    return await started;
  }

  isInflight(key: string): boolean {
    const result = this.#inFlight.has(key);
    return result;
  }
}
