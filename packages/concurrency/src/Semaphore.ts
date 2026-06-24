/** Counting permit gate. acquire() returns a release function. */

import { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import { SemaphoreError } from './errors/SemaphoreError.js';
import { SemaphoreBuilder } from './SemaphoreBuilder.js';

export class Semaphore {
  static builder(): SemaphoreBuilder {
    const result = SemaphoreBuilder.create((options) => {
      const semaphore = Semaphore.create(options);
      return semaphore;
    });
    return result;
  }

  static create(options: SemaphoreOptionsEntity.Type): Semaphore {
    const result = new this(options);
    return result;
  }

  static #validate(options: SemaphoreOptionsEntity.Type): void {
    if (!SemaphoreOptionsEntity.validate(options)) {
      throw new SemaphoreError('permits must be a positive integer');
    }
    if (!Number.isInteger(options.permits) || options.permits < 1) {
      throw new SemaphoreError('permits must be a positive integer');
    }
  }

  #available: number;
  readonly #permits: number;
  readonly #queue: (() => void)[];

  protected constructor(options: SemaphoreOptionsEntity.Type) {
    Semaphore.#validate(options);
    this.#available = options.permits;
    this.#permits = options.permits;
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
