/** Counting permit gate. acquire() returns a release function. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

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
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #available: number;
  readonly #permits: number;
  readonly #queue: CircularBuffer<() => void>;

  protected constructor(options: SemaphoreOptionsEntity.Type) {
    Semaphore.#validate(options);
    this.#available = options.permits;
    this.#permits = options.permits;
    this.#queue = CircularBuffer.create<() => void>({ 'overflow': 'grow' });
  }

  get available(): number { const result = this.#available;
    return result; }
  get permits(): number { const result = this.#permits;
    return result; }

  async acquire(): Promise<() => Promise<void>> {
    if (this.#available > 0) {
      const permitsBefore = this.#available;
      this.#available -= 1;
      await Promise.resolve(this.hooks.invoke('onAcquire', () => { const result = this.onAcquire(permitsBefore); return result; }));
      return this.#buildRelease();
    }
    // The waiter must be enqueued synchronously, before any `await`, so a
    // concurrent release() (itself synchronous up to its own first `await`)
    // can never observe an empty queue while this call is still "in flight"
    // waiting on a hook — that race would strand the waiter forever (the
    // permit gets returned to the pool instead of delegated to it).
    let resolveWaiter!: (release: () => Promise<void>) => void;
    const waiterPromise = new Promise<() => Promise<void>>((resolve) => { resolveWaiter = resolve; });
    this.#queue.push(() => { resolveWaiter(this.#buildRelease()); });
    const queueLength = this.#queue.length;

    await Promise.resolve(this.hooks.invoke('onAcquireWait', () => { const result = this.onAcquireWait(); return result; }));
    await Promise.resolve(this.hooks.invoke('onContended', () => { const result = this.onContended(queueLength); return result; }));
    return await waiterPromise;
  }

  async withPermit<T>(callback: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try { return await callback(); } finally { await release(); }
  }

  #buildRelease(): () => Promise<void> {
    let released = false;
    return async () => {
      if (released) { return; }
      released = true;
      await this.#release();
    };
  }

  async #release(): Promise<void> {
    const next = this.#queue.shift();
    if (next !== undefined) {
      next();
      await Promise.resolve(this.hooks.invoke('onReleaseDelegated', () => { const result = this.onReleaseDelegated(); return result; }));
      return;
    }
    this.#available += 1;
    await Promise.resolve(this.hooks.invoke('onRelease', () => { const result = this.onRelease(this.#available); return result; }));
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
