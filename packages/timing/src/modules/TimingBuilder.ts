import type { TimingOptionsEntity } from '../entities/TimingOptionsEntity.js';
import type { TimingBuilderInterface } from '../interfaces/TimingBuilderInterface.js';
import type { TimingInterface } from '../interfaces/TimingInterface.js';

/**
 * Builder for creating Timing instances.
 * Use Timing.builder() to get an instance.
 *
 * @public
 *
 * @example
 * ```typescript
 * import { Timing } from '@studnicky/timing';
 *
 * // Create timing instance with builder
 * const timing = Timing.builder()
 *   .maxEvents(100)
 *   .precision({ ms: 2 })
 *   .build();
 * ```
 */
export class TimingBuilder implements TimingBuilderInterface {
  /**
   * Creates a new TimingBuilder.
   * Use Timing.builder() instead of calling this directly.
   *
   * @param factory - Factory function to create Timing instances
   * @returns A new TimingBuilder instance
   */
  static create(factory: (options: TimingOptionsEntity.Type) => TimingInterface): TimingBuilder {
    const result = new TimingBuilder(factory);
    return result;
  }

  readonly #create: (options: TimingOptionsEntity.Type) => TimingInterface;

  #config: Partial<TimingOptionsEntity.Type> = {};

  /**
   * Private constructor. Use Timing.builder() to instantiate.
   * @param create - Factory closure to create Timing instances
   */
  private constructor(create: (options: TimingOptionsEntity.Type) => TimingInterface) {
    this.#create = create;
    this.#config = {};
  }

  /**
   * Builds the Timing instance with configured options.
   * Constructs the options object and delegates to the factory.
   * Validation is performed by the Timing constructor.
   * @returns Timing instance
   * @throws ConfigurationError if configuration is invalid
   */
  build(): TimingInterface {
    const result = this.#create({ ...this.#config });
    return result;
  }

  /**
   * Sets the maximum number of events to store.
   * When exceeded, oldest events are evicted (LRU behavior).
   * @param value - Maximum events (must be positive integer or Infinity)
   * @returns this for method chaining
   */
  maxEvents(value: number): this {
    this.#config.maxEvents = value;

    return this;
  }

  /**
   * Sets the precision configuration for time unit formatting.
   * @param config - Precision configuration per time unit
   * @returns this for method chaining
   */
  precision(config: TimingOptionsEntity.PrecisionConfigType): this {
    this.#config.precision = config;

    return this;
  }
}
