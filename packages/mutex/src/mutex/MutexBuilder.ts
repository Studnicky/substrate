/**
 * Builder for Mutex instances
 *
 * Provides a fluent interface for configuring and creating Mutex instances.
 */

import type { MutexBuilderInterface } from '../interfaces/index.js';
import type { MutexConfigType } from '../types/MutexConfigType.js';

import { Mutex } from './Mutex.js';

/**
 * Builder class for Mutex
 *
 * @example
 * ```typescript
 * const mutex = new MutexBuilder<string>()
 *   .withMaxQueueSize(100)
 *   .withTimeout(5000)
 *   .build();
 * ```
 */
export class MutexBuilder<K extends PropertyKey = string> implements MutexBuilderInterface<K> {
  private readonly config: Partial<MutexConfigType>;

  constructor(initialConfig?: Partial<MutexConfigType>) {
    this.config = initialConfig ?? {};
  }

  /**
   * Build the Mutex instance with the configured settings
   *
   * @returns New Mutex instance
   * @throws {Error} If configuration validation fails
   *
   * @example
   * ```typescript
   * const mutex = new MutexBuilder<string>()
   *   .withMaxQueueSize(100)
   *   .withTimeout(5000)
   *   .build();
   * ```
   */
  build(): Mutex<K> {
    return Mutex.create<K>(this.config);
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
   * const mutex = new MutexBuilder<string>()
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
    this.config.enableCoalescing = enabled;

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
   * const mutex = new MutexBuilder<string>()
   *   .withMaxQueueSize(100)
   *   .build();
   * ```
   */
  withMaxQueueSize(size: number): this {
    this.config.maxQueueSize = size;

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
   * const mutex = new MutexBuilder<string>()
   *   .withTimeout(5000)
   *   .build();
   * ```
   */
  withTimeout(ms: number): this {
    this.config.timeout = ms;

    return this;
  }
}
