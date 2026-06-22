/** Counting permit gate. acquire() returns a release function. */

export class Semaphore {
  #available: number;
  readonly #permits: number;
  readonly #queue: (() => void)[];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new RangeError(`permits must be an integer >= 1, got ${permits}`);
    }
    this.#available = permits;
    this.#permits = permits;
    this.#queue = [];
  }

  get available(): number { return this.#available; }
  get permits(): number { return this.#permits; }

  async acquire(): Promise<() => void> {
    if (this.#available > 0) {
      this.#available -= 1;
      return this.#buildRelease();
    }
    return await new Promise<() => void>((resolve) => {
      this.#queue.push(() => { resolve(this.#buildRelease()); });
    });
  }

  async withPermit<T>(callback: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try { return await callback(); } finally { release(); }
  }

  #buildRelease(): () => void {
    let released = false;
    return () => {
      if (released) { return; }
      released = true;
      this.#release();
    };
  }

  #release(): void {
    const next = this.#queue.shift();
    if (next !== undefined) { next(); return; }
    this.#available += 1;
  }
}
