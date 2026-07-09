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
      const permitsBefore = this.#available;
      this.#available -= 1;
      this.#invokeHook(() => { this.onAcquire(permitsBefore); });
      return this.#buildRelease();
    }
    this.#invokeHook(() => { this.onAcquireWait(); });
    return await new Promise<() => void>((resolve) => {
      this.#queue.push(() => { resolve(this.#buildRelease()); });
      this.#invokeHook(() => { this.onContended(this.#queue.length); });
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
    if (next !== undefined) {
      next();
      this.#invokeHook(() => { this.onReleaseDelegated(); });
      return;
    }
    this.#available += 1;
    this.#invokeHook(() => { this.onRelease(this.#available); });
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  /**
   * Fires when a permit is granted immediately.
   * `permitsBefore` is the available count BEFORE decrement.
   * Overrides must not throw or block.
   */
  protected onAcquire(_permitsBefore: number): void {}

  /**
   * Fires when the caller had to queue (no permit available).
   * Overrides must not throw or block.
   */
  protected onAcquireWait(): void {}

  /**
   * Fires when a new waiter is added to the queue.
   * `queueLength` is the queue length AFTER push.
   * Overrides must not throw or block.
   */
  protected onContended(_queueLength: number): void {}

  /**
   * Fires when a permit is returned to the pool (no waiting callers).
   * `permitsAfter` is the available count AFTER increment.
   * Overrides must not throw or block.
   */
  protected onRelease(_permitsAfter: number): void {}

  /**
   * Fires when a permit is handed to a queued waiter (not returned to pool).
   * Overrides must not throw or block.
   */
  protected onReleaseDelegated(): void {}
}
