/** Fluent builder for SlidingWindowLimiter. */

import type { SlidingWindowLimiterOptionsInterface } from './interfaces/SlidingWindowLimiterOptionsInterface.js';
import type { SlidingWindowLimiter } from './SlidingWindowLimiter.js';

import { SlidingWindowLimiterConfigError } from './errors/SlidingWindowLimiterConfigError.js';

export class SlidingWindowLimiterBuilder {
  readonly #create: (options: SlidingWindowLimiterOptionsInterface) => SlidingWindowLimiter;
  #limit?: number;
  #windowMs?: number;
  #algorithm?: 'log' | 'counter';
  #clock?: () => number;

  static create(create: (options: SlidingWindowLimiterOptionsInterface) => SlidingWindowLimiter): SlidingWindowLimiterBuilder {
    return new SlidingWindowLimiterBuilder(create);
  }

  private constructor(create: (options: SlidingWindowLimiterOptionsInterface) => SlidingWindowLimiter) {
    this.#create = create;
  }

  withLimit(value: number): this {
    this.#limit = value;
    return this;
  }

  withWindowMs(value: number): this {
    this.#windowMs = value;
    return this;
  }

  withAlgorithm(value: 'log' | 'counter'): this {
    this.#algorithm = value;
    return this;
  }

  withClock(value: () => number): this {
    this.#clock = value;
    return this;
  }

  build(): SlidingWindowLimiter {
    if (this.#limit === undefined) {
      throw new SlidingWindowLimiterConfigError('limit is required');
    }
    if (this.#windowMs === undefined) {
      throw new SlidingWindowLimiterConfigError('windowMs is required');
    }
    if (this.#algorithm === undefined) {
      throw new SlidingWindowLimiterConfigError('algorithm is required');
    }
    const options: SlidingWindowLimiterOptionsInterface = {
      'algorithm': this.#algorithm,
      'limit': this.#limit,
      'windowMs': this.#windowMs,
      ...(this.#clock !== undefined ? { 'clock': this.#clock } : {})
    };
    return this.#create(options);
  }
}
