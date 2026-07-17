/** Fluent builder for SlidingWindowLimiter. */

import { PickDefined } from '@studnicky/types';

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
    const options: SlidingWindowLimiterOptionsInterface = PickDefined.from({
      'algorithm': this.#algorithm,
      'clock': this.#clock,
      'limit': this.#limit,
      'windowMs': this.#windowMs
    });
    return this.#create(options);
  }
}
