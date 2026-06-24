import type { SampleBufferOptionsEntity } from '../entities/SampleBufferOptionsEntity.js';
import type { SampleBuffer } from './SampleBuffer.js';

/**
 * Fluent builder for creating SampleBuffer instances.
 *
 * @example
 * ```typescript
 * const buffer = SampleBuffer.builder().withCapacity(100).build();
 * ```
 */
export class SampleBufferBuilder {
  static create(create: (options: SampleBufferOptionsEntity.Type) => SampleBuffer): SampleBufferBuilder {
    return new SampleBufferBuilder(create);
  }

  readonly #create: (options: SampleBufferOptionsEntity.Type) => SampleBuffer;
  #capacity?: number;

  private constructor(create: (options: SampleBufferOptionsEntity.Type) => SampleBuffer) {
    this.#create = create;
  }

  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  build(): SampleBuffer {
    const options: SampleBufferOptionsEntity.Type = { 'capacity': this.#capacity ?? 100 };
    const result = this.#create(options);
    return result;
  }
}
