/** Keyed async coalescing: concurrent calls for the same key share one in-flight promise. */

export class Coalesce<T> {
  readonly #inFlight = new Map<string, Promise<T>>();

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
