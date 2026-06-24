import type { CircularBufferOptionsEntity } from '../entities/CircularBufferOptionsEntity.js';
import type { CircularBuffer } from './CircularBuffer.js';

import { DEFAULT_BUFFER_CAPACITY } from '../constants/index.js';

/**
 * Fluent builder for creating CircularBuffer instances.
 *
 * @example
 * ```typescript
 * const buf = CircularBuffer.builder<number>()
 *   .withCapacity(16)
 *   .withOverflow('grow')
 *   .build();
 * ```
 */
export class CircularBufferBuilder<T> {
  static create<T>(
    create: (options: CircularBufferOptionsEntity.Type) => CircularBuffer<T>
  ): CircularBufferBuilder<T> {
    return new CircularBufferBuilder<T>(create);
  }

  readonly #create: (options: CircularBufferOptionsEntity.Type) => CircularBuffer<T>;
  #capacity: number | undefined;
  #overflow: 'grow' | 'overwrite' | undefined;

  private constructor(
    create: (options: CircularBufferOptionsEntity.Type) => CircularBuffer<T>
  ) {
    this.#create = create;
  }

  /**
   * Set the buffer capacity.
   *
   * @param value - Maximum number of items before overflow behavior triggers
   * @returns This builder for chaining
   */
  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  /**
   * Set the overflow strategy.
   *
   * @param value - 'overwrite' evicts oldest item (default); 'grow' doubles capacity
   * @returns This builder for chaining
   */
  withOverflow(value: 'grow' | 'overwrite'): this {
    this.#overflow = value;
    return this;
  }

  /**
   * Build and return the configured CircularBuffer instance.
   * Validation is performed in the CircularBuffer constructor.
   *
   * @returns New CircularBuffer instance
   */
  build(): CircularBuffer<T> {
    const options: CircularBufferOptionsEntity.Type = {
      'capacity': this.#capacity ?? DEFAULT_BUFFER_CAPACITY
    };

    if (this.#overflow !== undefined) {
      options.overflow = this.#overflow;
    }

    return this.#create(options);
  }
}
