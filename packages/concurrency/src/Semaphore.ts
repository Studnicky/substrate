/** Counting permit gate. acquire() returns a release function. */

import { SemaphoreError } from './errors/SemaphoreError.js';

export class Semaphore {
  #available: number;
  readonly #permits: number;
  readonly #queue: (() => void)[];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new SemaphoreError('permits must be a positive integer');
    }
    this.#available = permits;
    this.#permits = permits;
    this.#queue = [];
  }

  get available(): number { const result = this.#available;
    return result; }
  get permits(): number { const result = this.#permits;
    return result; }

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
