/**
 * Fluent builder for BoundaryKit instances
 */

import type { CircuitBreaker, CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Throttle, ThrottleConfigEntity } from '@studnicky/throttle';

import { PickDefined } from '@studnicky/types';

import type { BoundaryKit } from './BoundaryKit.js';
import type { BoundaryKitConfigType } from './types/BoundaryKitConfigType.js';

/**
 * Builder for creating BoundaryKit instances with a fluent API.
 *
 * @example
 * ```typescript
 * const kit = BoundaryKit.builder()
 *   .throttle({ concurrencyLimit: 10 })
 *   .circuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30_000 })
 *   .retry({ maxRetries: 3 })
 *   .build();
 * ```
 */
export class BoundaryKitBuilder {
  static create(create: (config: BoundaryKitConfigType) => BoundaryKit): BoundaryKitBuilder {
    return new BoundaryKitBuilder(create);
  }

  readonly #create: (config: BoundaryKitConfigType) => BoundaryKit;
  #circuitBreaker?: CircuitBreaker | CircuitBreakerOptionsInterface;
  #retry?: RetryConfigInterface | Retry;
  #throttle?: ThrottleConfigEntity.Type | Throttle;

  private constructor(create: (config: BoundaryKitConfigType) => BoundaryKit) {
    this.#create = create;
  }

  /**
   * Build and return the BoundaryKit instance
   */
  build(): BoundaryKit {
    const config: BoundaryKitConfigType = PickDefined.from({
      'circuitBreaker': this.#circuitBreaker,
      'retry': this.#retry,
      'throttle': this.#throttle
    });
    return this.#create(config);
  }

  /**
   * Set the composed CircuitBreaker instance or config
   */
  circuitBreaker(value: CircuitBreaker | CircuitBreakerOptionsInterface): this {
    this.#circuitBreaker = value;
    return this;
  }

  /**
   * Set the composed Retry instance or config
   */
  retry(value: RetryConfigInterface | Retry): this {
    this.#retry = value;
    return this;
  }

  /**
   * Set the composed Throttle instance or config
   */
  throttle(value: ThrottleConfigEntity.Type | Throttle): this {
    this.#throttle = value;
    return this;
  }
}
