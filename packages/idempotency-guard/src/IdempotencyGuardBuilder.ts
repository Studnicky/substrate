/**
 * Fluent builder for IdempotencyGuard instances
 */

import type { IdempotencyGuard } from './IdempotencyGuard.js';
import type { IdempotencyGuardOptionsType } from './types/IdempotencyGuardOptionsType.js';

import { IdempotencyGuardConfigError } from './errors/index.js';

/**
 * Builder for creating IdempotencyGuard instances with a fluent API.
 *
 * @example
 * ```typescript
 * const guard = IdempotencyGuard.builder()
 *   .withCapacity(1000)
 *   .withTtlMs(60_000)
 *   .build();
 * ```
 */
export class IdempotencyGuardBuilder {
  static create(create: (options: IdempotencyGuardOptionsType) => IdempotencyGuard): IdempotencyGuardBuilder {
    return new IdempotencyGuardBuilder(create);
  }

  readonly #create: (options: IdempotencyGuardOptionsType) => IdempotencyGuard;
  #capacity?: number;
  #ttlMs?: number;

  private constructor(create: (options: IdempotencyGuardOptionsType) => IdempotencyGuard) {
    this.#create = create;
  }

  /** Set the maximum number of distinct idempotency keys retained at once. */
  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  /** Set the time-to-live (ms) for a cached key/result/fingerprint entry. */
  withTtlMs(value: number): this {
    this.#ttlMs = value;
    return this;
  }

  build(): IdempotencyGuard {
    if (this.#capacity === undefined) {
      throw new IdempotencyGuardConfigError('capacity is required');
    }
    if (this.#ttlMs === undefined) {
      throw new IdempotencyGuardConfigError('ttlMs is required');
    }
    const options: IdempotencyGuardOptionsType = {
      'capacity': this.#capacity,
      'ttlMs': this.#ttlMs
    };
    return this.#create(options);
  }
}
