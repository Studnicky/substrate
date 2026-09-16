import type { SemaphoreAcquireOptionsInterface } from './interfaces/SemaphoreAcquireOptionsInterface.js';

import { SemaphoreOptionsEntity } from './entities/SemaphoreOptionsEntity.js';
import { SemaphoreError } from './errors/SemaphoreError.js';
import { Semaphore } from './Semaphore.js';

/**
 * Maintains independent semaphore admission pools for resource keys.
 *
 * Each key receives the same configured permit and queue capacity. Idle keys
 * are removed automatically, so transient keys do not retain coordination state.
 */
export class KeyedSemaphore<K extends PropertyKey> {
  static create<K extends PropertyKey>(options: SemaphoreOptionsEntity.Type): KeyedSemaphore<K> {
    return new KeyedSemaphore<K>(options);
  }

  readonly #options: SemaphoreOptionsEntity.Type;
  readonly #semaphores = new Map<K, Semaphore>();

  private constructor(options: SemaphoreOptionsEntity.Type) {
    if (!SemaphoreOptionsEntity.validate(options)) {
      throw new SemaphoreError('Semaphore options must contain a positive integer permits value and a non-negative integer maximumQueueSize when provided.');
    }
    this.#options = options.maximumQueueSize === undefined
      ? { 'permits': options.permits }
      : { 'maximumQueueSize': options.maximumQueueSize, 'permits': options.permits };
  }

  get keyCount(): number {
    const result = this.#semaphores.size;
    return result;
  }

  activeCount(): number;
  activeCount(key: K): number;
  activeCount(key?: K): number {
    if (key === undefined) {
      let result = 0;
      for (const semaphore of this.#semaphores.values()) {
        result += semaphore.activeCount;
      }
      return result;
    }
    const result = this.#semaphores.get(key)?.activeCount ?? 0;
    return result;
  }

  async acquire(
    key: K,
    options: SemaphoreAcquireOptionsInterface = {}
  ): Promise<() => Promise<void>> {
    const semaphore = this.#semaphoreFor(key);
    try {
      const release = await semaphore.acquire(options);
      const result = this.#buildRelease(key, semaphore, release);
      return result;
    } catch (error) {
      this.#removeIfIdle(key, semaphore);
      throw error;
    }
  }

  queuedCount(): number;
  queuedCount(key: K): number;
  queuedCount(key?: K): number {
    if (key === undefined) {
      let result = 0;
      for (const semaphore of this.#semaphores.values()) {
        result += semaphore.queuedCount;
      }
      return result;
    }
    const result = this.#semaphores.get(key)?.queuedCount ?? 0;
    return result;
  }

  async waitForIdle(): Promise<void>;
  async waitForIdle(key: K): Promise<void>;
  async waitForIdle(key?: K): Promise<void> {
    if (key === undefined) {
      await this.#waitForAllIdle();
      return;
    }
    const semaphore = this.#semaphores.get(key);
    if (semaphore === undefined) {
      return;
    }
    await semaphore.waitForIdle();
    this.#removeIfIdle(key, semaphore);
  }

  async withPermit<T>(
    key: K,
    callback: () => Promise<T>,
    options: SemaphoreAcquireOptionsInterface = {}
  ): Promise<T> {
    const release = await this.acquire(key, options);
    try {
      const result = await callback();
      return result;
    } finally {
      await release();
    }
  }

  #buildRelease(
    key: K,
    semaphore: Semaphore,
    release: () => Promise<void>
  ): () => Promise<void> {
    return async (): Promise<void> => {
      try {
        await release();
      } finally {
        this.#removeIfIdle(key, semaphore);
      }
    };
  }

  #removeIfIdle(key: K, semaphore: Semaphore): void {
    if (
      this.#semaphores.get(key) === semaphore
      && semaphore.activeCount === 0
      && semaphore.queuedCount === 0
    ) {
      this.#semaphores.delete(key);
    }
  }

  #semaphoreFor(key: K): Semaphore {
    const existing = this.#semaphores.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const result = Semaphore.create(this.#options);
    this.#semaphores.set(key, result);
    return result;
  }

  async #waitForAllIdle(): Promise<void> {
    while (this.#semaphores.size > 0) {
      const pools = Array.from(this.#semaphores.entries());
      const idleWaiters: Promise<void>[] = [];
      for (let index = 0; index < pools.length; index += 1) {
        const pool = pools.at(index);
        if (pool === undefined) {
          continue;
        }
        const [key, semaphore] = pool;
        idleWaiters.push(this.#waitForPoolIdle(key, semaphore));
      }
      await Promise.all(idleWaiters);
    }
  }

  async #waitForPoolIdle(key: K, semaphore: Semaphore): Promise<void> {
    await semaphore.waitForIdle();
    this.#removeIfIdle(key, semaphore);
  }
}
