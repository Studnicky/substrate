/** Fluent builder for TokenBucket. */

import { PickDefined } from '@studnicky/types';

import type { TokenBucketOptionsInterface } from './interfaces/TokenBucketOptionsInterface.js';
import type { TokenBucket } from './TokenBucket.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class TokenBucketBuilder {
  readonly #create: (options: TokenBucketOptionsInterface) => TokenBucket;
  #requestsPerSecond?: number;
  #burstSize?: number;
  #clock?: () => number;

  static create(create: (options: TokenBucketOptionsInterface) => TokenBucket): TokenBucketBuilder {
    return new TokenBucketBuilder(create);
  }

  private constructor(create: (options: TokenBucketOptionsInterface) => TokenBucket) {
    this.#create = create;
  }

  withRequestsPerSecond(value: number): this {
    this.#requestsPerSecond = value;
    return this;
  }

  withBurstSize(value: number): this {
    this.#burstSize = value;
    return this;
  }

  withClock(value: () => number): this {
    this.#clock = value;
    return this;
  }

  build(): TokenBucket {
    if (this.#requestsPerSecond === undefined) {
      throw new ResilienceConfigError('requestsPerSecond is required');
    }
    if (this.#burstSize === undefined) {
      throw new ResilienceConfigError('burstSize is required');
    }
    const options: TokenBucketOptionsInterface = PickDefined.from({
      'burstSize': this.#burstSize,
      'clock': this.#clock,
      'requestsPerSecond': this.#requestsPerSecond
    });
    return this.#create(options);
  }
}
