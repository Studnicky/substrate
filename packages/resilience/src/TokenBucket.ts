/** Token bucket rate limiter; consume() throws when exhausted, waitForToken() blocks until available. */

import type { TokenBucketOptionsInterface } from './interfaces/TokenBucketOptionsInterface.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';
import { TokenBucketBuilder } from './TokenBucketBuilder.js';
import { TokenBucketExhaustedError } from './TokenBucketExhaustedError.js';

export class TokenBucket {
  readonly #requestsPerSecond: number;
  readonly #burstSize: number;
  readonly #clock: () => number;
  #tokens: number;
  #lastRefill: number;

  static builder(): TokenBucketBuilder {
    const factory = (options: TokenBucketOptionsInterface): TokenBucket => {
      const result = TokenBucket.create(options);
      return result;
    };
    const result = TokenBucketBuilder.create(factory);
    return result;
  }

  static create(options: TokenBucketOptionsInterface): TokenBucket {
    return new this(options);
  }

  protected constructor(options: TokenBucketOptionsInterface) {
    if (options.requestsPerSecond <= 0) {throw new ResilienceConfigError('requestsPerSecond must be > 0');}
    if (options.burstSize < 1) {throw new ResilienceConfigError('burstSize must be >= 1');}
    this.#requestsPerSecond = options.requestsPerSecond;
    this.#burstSize = options.burstSize;
    this.#clock = options.clock ?? (() => { const result = Date.now(); return result; });
    this.#tokens = options.burstSize;
    this.#lastRefill = this.#clock();
  }

  get available(): number {
    this.#refill();
    return this.#tokens;
  }

  /** Throws TokenBucketExhaustedError if no token available. */
  consume(tokens = 1): void {
    this.#refill();
    if (this.#tokens < tokens) { throw new TokenBucketExhaustedError(); }
    this.#tokens -= tokens;
  }

  /** Wait until tokens are available, then consume. */
  async waitForToken(options: { 'signal'?: AbortSignal; 'tokens'?: number } = {}): Promise<void> {
    const tokens = options.tokens ?? 1;
    const signal = options.signal;
    while (true) {
      this.#refill();
      if (this.#tokens >= tokens) { this.#tokens -= tokens; return; }
      const waitMs = Math.ceil((tokens - this.#tokens) / this.#requestsPerSecond * 1000);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, waitMs);
        signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { 'once': true });
      });
    }
  }

  #refill(): void {
    const now = this.#clock();
    const elapsed = now - this.#lastRefill;
    const newTokens = (elapsed / 1000) * this.#requestsPerSecond;
    this.#tokens = Math.min(this.#burstSize, this.#tokens + newTokens);
    this.#lastRefill = now;
  }
}
