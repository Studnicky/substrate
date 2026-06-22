/** Token bucket rate limiter; consume() throws when exhausted, waitForToken() blocks until available. */

import type { TokenBucketOptionsType } from './TokenBucketOptionsType.js';

import { TokenBucketExhaustedError } from './TokenBucketExhaustedError.js';

export class TokenBucket {
  readonly #requestsPerSecond: number;
  readonly #burstSize: number;
  readonly #clock: () => number;
  #tokens: number;
  #lastRefill: number;

  constructor(options: TokenBucketOptionsType) {
    if (options.requestsPerSecond <= 0) throw new RangeError('requestsPerSecond must be > 0');
    if (options.burstSize < 1) throw new RangeError('burstSize must be >= 1');
    this.#requestsPerSecond = options.requestsPerSecond;
    this.#burstSize = options.burstSize;
    this.#clock = options.clock ?? (() => Date.now());
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
  async waitForToken(tokens = 1, signal?: AbortSignal): Promise<void> {
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
