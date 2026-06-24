/**
 * Builder for Mutex instances
 *
 * Provides a fluent interface for configuring and creating Mutex instances.
 */

import type { MutexConfigEntity } from '../entities/MutexConfigEntity.js';
import type { MutexBuilderInterface } from '../interfaces/index.js';
import type { Mutex } from './Mutex.js';

/**
 * Builder class for Mutex
 *
 * @example
 * ```typescript
 * const mutex = Mutex.builder<string>()
 *   .withMaxQueueSize(100)
 *   .withTimeout(5000)
 *   .build();
 * ```
 */
export class MutexBuilder<K extends PropertyKey = string> implements MutexBuilderInterface<K> {
  static create<K extends PropertyKey = string>(
    create: (options: Partial<MutexConfigEntity.Type>) => Mutex<K>
  ): MutexBuilder<K> {
    return new MutexBuilder<K>(create);
  }

  readonly #create: (options: Partial<MutexConfigEntity.Type>) => Mutex<K>;
  #enableCoalescing?: boolean;
  #maxQueueSize?: number;
  #timeout?: number;

  private constructor(create: (options: Partial<MutexConfigEntity.Type>) => Mutex<K>) {
    this.#create = create;
  }

  /**
   * Build the Mutex instance with the configured settings
   *
   * @returns New Mutex instance
   * @throws {ConfigurationError} If configuration validation fails
   *
   * @example
   * ```typescript
   * const mutex = Mutex.builder<string>()
   *   .withMaxQueueSize(100)
   *   .withTimeout(5000)
   *   .build();
   * ```
   */
  build(): Mutex<K> {
    const options: Partial<MutexConfigEntity.Type> = {};
    if (this.#enableCoalescing !== undefined) {
      options.enableCoalescing = this.#enableCoalescing;
    }
    if (this.#maxQueueSize !== undefined) {
      options.maxQueueSize = this.#maxQueueSize;
    }
    if (this.#timeout !== undefined) {
      options.timeout = this.#timeout;
    }
    return this.#create(options);
  }

  /**
   * Enable request coalescing for runExclusive operations
   *
   * When enabled, concurrent calls to runExclusive with the same key will
   * share the result of the first in-flight operation instead of queueing serially.
   *
   * @param enabled - Whether to enable coalescing
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const mutex = Mutex.builder<string>()
   *   .withCoalescing(true)
   *   .build();
   *
   * // Multiple concurrent calls will share the same result
   * await Promise.all([
   *   mutex.runExclusive('key1', () => fetchData()),
   *   mutex.runExclusive('key1', () => fetchData())  // Joins first operation
   * ]);
   * ```
   */
  withCoalescing(enabled: boolean): this {
    this.#enableCoalescing = enabled;
    return this;
  }

  /**
   * Set the maximum queue size per key
   *
   * @param size - Maximum number of operations that can queue per key (0 for unlimited)
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const mutex = Mutex.builder<string>()
   *   .withMaxQueueSize(100)
   *   .build();
   * ```
   */
  withMaxQueueSize(size: number): this {
    this.#maxQueueSize = size;
    return this;
  }

  /**
   * Set the timeout for lock acquisition
   *
   * @param ms - Maximum time (ms) to wait for lock acquisition (0 for no timeout)
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const mutex = Mutex.builder<string>()
   *   .withTimeout(5000)
   *   .build();
   * ```
   */
  withTimeout(ms: number): this {
    this.#timeout = ms;
    return this;
  }
}
