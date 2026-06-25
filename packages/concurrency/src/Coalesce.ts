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
    if (existing !== undefined) {
      this.onCoalesceJoin(key);
      return await existing;
    }

    let success = false;
    const started = factory()
      .then((v) => { success = true; return v; })
      .catch((e: unknown) => { success = false; throw e; })
      .finally(() => {
        this.#inFlight.delete(key);
        this.onCoalesceSettled(key, success);
      });
    this.#inFlight.set(key, started);
    this.onCoalesceStart(key);
    return await started;
  }

  isInflight(key: string): boolean {
    const result = this.#inFlight.has(key);
    return result;
  }

  /**
   * Fires when this is the leader caller — factory is about to be invoked.
   * Overrides must not throw or block.
   */
  protected onCoalesceStart(_key: string): void {}

  /**
   * Fires when this caller joined an in-flight call.
   * Overrides must not throw or block.
   */
  protected onCoalesceJoin(_key: string): void {}

  /**
   * Fires when the in-flight promise settles.
   * `success` is true on resolve, false on reject.
   * Overrides must not throw or block.
   */
  protected onCoalesceSettled(_key: string, _success: boolean): void {}
}
