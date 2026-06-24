import type { AdaptiveConfigEntity } from '../entities/AdaptiveConfigEntity.js';
import type { ThrottleConfigEntity } from '../entities/ThrottleConfigEntity.js';
import type { ThrottleBuilderInterface } from '../interfaces/index.js';

import { Throttle } from './Throttle.js';

type AdaptiveConfigInputType = AdaptiveConfigEntity.AdaptiveConfigInputType;
type ThrottleConfigType = ThrottleConfigEntity.Type;

/**
 * Builder for creating Throttle instances with a fluent API
 *
 * @example Basic usage
 * ```typescript
 * const throttle = new ThrottleBuilder()
 *   .withConcurrencyLimit(5)
 *   .build();
 * ```
 *
 */
export class ThrottleBuilder implements ThrottleBuilderInterface {
  private readonly config: Partial<ThrottleConfigType> = {};

  /**
   * Build and return the configured Throttle instance
   *
   * @returns New Throttle instance with configured settings
   *
   * @example
   * ```typescript
   * const throttle = new ThrottleBuilder()
   *   .withConcurrencyLimit(5)
   *   .build();
   * ```
   */
  build(): Throttle {
    const result = Throttle.create(this.config);
    return result;
  }

  /**
   * Enable adaptive concurrency with configuration
   *
   * @param config - Adaptive concurrency configuration
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const throttle = new ThrottleBuilder()
   *   .withConcurrencyLimit(10)
   *   .withAdaptiveConcurrency({
   *     enabled: true,
   *     targetLatencyMs: 200,
   *     minConcurrency: 2,
   *     maxConcurrency: 50
   *   })
   *   .build();
   * ```
   */
  withAdaptiveConcurrency(config: AdaptiveConfigInputType): this {
    this.config.adaptive = config;

    return this;
  }

  /**
   * Set the concurrency limit
   *
   * @param limit - Maximum number of concurrent operations
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const throttle = new ThrottleBuilder()
   *   .withConcurrencyLimit(5)
   *   .build();
   * ```
   */
  withConcurrencyLimit(limit: number): this {
    this.config.concurrencyLimit = limit;

    return this;
  }
}
