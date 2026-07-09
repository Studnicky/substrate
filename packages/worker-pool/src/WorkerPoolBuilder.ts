/** Fluent builder for WorkerPool instances */

import type { Signal } from '@studnicky/signal';

import type { WorkerPoolConfigType } from './types/WorkerPoolConfigType.js';
import type { WorkerPool } from './WorkerPool.js';

/**
 * Builder for creating WorkerPool instances with a fluent API.
 *
 * @example
 * ```typescript
 * const pool = WorkerPool.builder()
 *   .workerPath(new URL('./worker.mjs', import.meta.url).pathname)
 *   .concurrency(4)
 *   .timeoutMs(5000)
 *   .build();
 * ```
 */
export class WorkerPoolBuilder<TMessage = unknown, TResult = unknown> {
  static create<TMessage = unknown, TResult = unknown>(
    create: (config: WorkerPoolConfigType) => WorkerPool<TMessage, TResult>
  ): WorkerPoolBuilder<TMessage, TResult> {
    return new WorkerPoolBuilder(create);
  }

  readonly #create: (config: WorkerPoolConfigType) => WorkerPool<TMessage, TResult>;
  #workerPath?: string;
  #concurrency?: number;
  #timeoutMs?: number;
  #signal?: Signal;

  private constructor(create: (config: WorkerPoolConfigType) => WorkerPool<TMessage, TResult>) {
    this.#create = create;
  }

  /**
   * Build and return the WorkerPool instance. Throws if `workerPath()` was never set.
   */
  build(): WorkerPool<TMessage, TResult> {
    if (this.#workerPath === undefined) {
      throw new Error('WorkerPoolBuilder: workerPath is required');
    }

    const config: WorkerPoolConfigType = {
      'workerPath': this.#workerPath,
      ...(this.#concurrency !== undefined ? { 'concurrency': this.#concurrency } : {}),
      ...(this.#timeoutMs !== undefined ? { 'timeoutMs': this.#timeoutMs } : {}),
      ...(this.#signal !== undefined ? { 'signal': this.#signal } : {})
    };
    return this.#create(config);
  }

  /**
   * Set the maximum number of workers running concurrently
   */
  concurrency(value: number): this {
    this.#concurrency = value;
    return this;
  }

  /**
   * Set the composed Signal instance used to derive the per-task timeout AbortSignal
   */
  signal(value: Signal): this {
    this.#signal = value;
    return this;
  }

  /**
   * Set the per-task timeout in ms
   */
  timeoutMs(value: number): this {
    this.#timeoutMs = value;
    return this;
  }

  /**
   * Set the path to the node:worker_threads entry script every spawned Worker runs
   */
  workerPath(value: string): this {
    this.#workerPath = value;
    return this;
  }
}
