import type { NoOpTiming } from './NoOpTiming.js';

/**
 * Builder for creating NoOpTiming instances.
 * Use NoOpTiming.builder() to get an instance.
 *
 * @public
 */
export class NoOpTimingBuilder {
  /**
   * Creates a new NoOpTimingBuilder.
   * Use NoOpTiming.builder() instead of calling this directly.
   *
   * @param create - Factory closure injected by NoOpTiming.builder()
   * @returns A new NoOpTimingBuilder instance
   */
  static create(create: () => NoOpTiming): NoOpTimingBuilder {
    return new NoOpTimingBuilder(create);
  }

  readonly #create: () => NoOpTiming;

  private constructor(create: () => NoOpTiming) {
    this.#create = create;
  }

  /**
   * Builds the NoOpTiming instance.
   * @returns NoOpTiming instance
   */
  build(): NoOpTiming {
    const result = this.#create();
    return result;
  }
}
