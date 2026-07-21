/** Counting permit gate. acquire() returns a release function. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

import type { SemaphoreWaiterStateEntity } from './entities/SemaphoreWaiterStateEntity.js';

import { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import { SemaphoreError } from './errors/SemaphoreError.js';

interface SemaphoreWaiterInterface {
  'cancelled': SemaphoreWaiterStateEntity.Type['cancelled'];
  'ready': SemaphoreWaiterStateEntity.Type['ready'];
  readonly 'reject': (reason?: unknown) => void;
  readonly 'resolve': (release: () => Promise<void>) => void;
}

export class Semaphore {
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
  #granting = false;
  #headWaiter: SemaphoreWaiterInterface | undefined;
  readonly #permits: number;
  readonly #queue: CircularBuffer<SemaphoreWaiterInterface>;

  protected constructor(options: SemaphoreOptionsEntity.Type) {
    Semaphore.#validate(options);
    this.#available = options.permits;
    this.#headWaiter = undefined;
    this.#permits = options.permits;
    this.#queue = CircularBuffer.create<SemaphoreWaiterInterface>({ 'overflow': 'grow' });
  }

  get available(): number { const result = this.#available;
    return result; }
  get permits(): number { const result = this.#permits;
    return result; }

  async acquire(): Promise<() => Promise<void>> {
    if (this.#available > 0 && this.#headWaiter === undefined && this.#queue.length === 0) {
      const permitsBefore = this.#available;
      this.#available -= 1;
      try {
        await this.hooks.invokeAsync('onAcquire', () => { const result = this.onAcquire(permitsBefore); return result; });
      } catch (error) {
        this.#available += 1;
        await this.#grantReadyWaiters();
        throw error;
      }
      return this.#buildRelease();
    }
    const waiterResult = Promise.withResolvers<() => Promise<void>>();
    const waiter: SemaphoreWaiterInterface = {
      'cancelled': false,
      'ready': false,
      'reject': waiterResult.reject,
      'resolve': waiterResult.resolve
    };
    this.#queue.push(waiter);
    const queueLength = this.#queue.length + (this.#headWaiter === undefined ? 0 : 1);

    try {
      await this.hooks.invokeAsync('onAcquireWait', () => { const result = this.onAcquireWait(); return result; });
      await this.hooks.invokeAsync('onContended', () => { const result = this.onContended(queueLength); return result; });
      waiter.ready = true;
    } catch (error) {
      waiter.cancelled = true;
      await this.#grantReadyWaiters();
      throw error;
    }

    await this.#grantReadyWaiters();
    return await waiterResult.promise;
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
    this.#available += 1;
    if (this.#headWaiter === undefined && this.#queue.length === 0 && !this.#granting) {
      await this.hooks.invokeAsync('onRelease', () => { const result = this.onRelease(this.#available); return result; });
      return;
    }
    const delegated = await this.#grantReadyWaiters();
    if (delegated === 0 && this.#headWaiter === undefined && this.#queue.length === 0 && !this.#granting) {
      await this.hooks.invokeAsync('onRelease', () => { const result = this.onRelease(this.#available); return result; });
    }
  }

  async #grantReadyWaiters(): Promise<number> {
    if (this.#granting) {
      return 0;
    }

    this.#granting = true;
    let delegated = 0;
    try {
      while (true) {
        const next = this.#headWaiter ?? this.#queue.shift();
        if (next === undefined) {
          break;
        }
        if (next.cancelled) {
          this.#headWaiter = undefined;
          continue;
        }
        if (this.#available === 0 || !next.ready) {
          this.#headWaiter = next;
          break;
        }

        this.#headWaiter = undefined;
        if (await this.#delegate(next)) {
          delegated += 1;
        }
      }
    } finally {
      this.#granting = false;
    }
    return delegated;
  }

  async #delegate(waiter: SemaphoreWaiterInterface): Promise<boolean> {
    this.#available -= 1;
    try {
      await this.hooks.invokeAsync('onReleaseDelegated', () => {
        const result = this.onReleaseDelegated();
        return result;
      });
    } catch (error) {
      this.#available += 1;
      waiter.reject(error);
      return false;
    }
    waiter.resolve(this.#buildRelease());
    return true;
  }

  /**
   * Fires when a permit is granted immediately.
   * `permitsBefore` is the available count BEFORE decrement.
   * A failure aborts the acquisition and returns the reserved permit.
   */
  protected onAcquire(_permitsBefore: number): void {}

  /**
   * Fires when the caller had to queue (no permit available).
   * A failure cancels the queued acquisition.
   */
  protected onAcquireWait(): void {}

  /**
   * Fires when a new waiter is added to the queue.
   * `queueLength` is the queue length AFTER push.
   * A failure cancels the queued acquisition.
   */
  protected onContended(_queueLength: number): void {}

  /**
   * Fires when a permit is returned to the pool (no waiting callers).
   * `permitsAfter` is the available count AFTER increment.
   * A failure rejects release after the permit is restored.
   */
  protected onRelease(_permitsAfter: number): void {}

  /**
   * Fires when a permit is handed to a queued waiter (not returned to pool).
   * A failure rejects that acquisition and leaves the permit available for
   * the next queued waiter.
   */
  protected onReleaseDelegated(): void {}
}
