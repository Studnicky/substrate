/** Token bucket rate limiter; consume() throws when exhausted, waitForToken() blocks until available. */

import { HookInvoker } from '@studnicky/errors';
import { RaceTimeout } from '@studnicky/signal';
import { Predicates } from '@studnicky/types';

import type { TokenBucketOptionsInterface } from './interfaces/TokenBucketOptionsInterface.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';
import { TokenBucketExhaustedError } from './TokenBucketExhaustedError.js';

interface TokenBucketSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class TokenBucketInstance {
  static belongsTo<TInstance extends object>(
    constructor: TokenBucketSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class TokenBucket {
  static readonly #OwnedHookInvoker = class TokenBucketHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #requestsPerSecond: number;
  readonly #burstSize: number;
  readonly #clock: () => number;
  #tokens: number;
  #lastRefill: number;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<TInstance extends TokenBucket = TokenBucket>(
    this: TokenBucketSubclassInterface<TInstance>,
    options: TokenBucketOptionsInterface
  ): TInstance {
    const resolveSubclassConstructor = (): TokenBucketSubclassInterface<TInstance> => {
      return this;
    };

    const result: unknown = Reflect.construct(resolveSubclassConstructor(), [options]);
    if (!Predicates.isObjectLike(result) || !TokenBucketInstance.belongsTo(resolveSubclassConstructor(), result)) {
      throw new TypeError('TokenBucket.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options: TokenBucketOptionsInterface) {
    this.hooks = new TokenBucket.#OwnedHookInvoker();
    if (options.requestsPerSecond <= 0) {throw new ResilienceConfigError('requestsPerSecond must be > 0');}
    if (options.burstSize < 1) {throw new ResilienceConfigError('burstSize must be >= 1');}
    this.#requestsPerSecond = options.requestsPerSecond;
    this.#burstSize = options.burstSize;
    this.#clock = options.clock ?? Date.now;
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
    if (this.#tokens < tokens) {
      this.hooks.invoke('onTokenDepleted', () => {
        const result = this.onTokenDepleted();
        return result;
      });
      throw new TokenBucketExhaustedError();
    }
    this.#tokens -= tokens;
    this.hooks.invoke('onTokenAcquired', () => {
      const result = this.onTokenAcquired(tokens);
      return result;
    });
  }

  /**
   * Wait until tokens are available, then consume.
   * Throws TokenBucketExhaustedError immediately if `tokens` exceeds burstSize (can never be satisfied).
   */
  async waitForToken(options: { 'signal'?: AbortSignal; 'tokens'?: number } = {}): Promise<void> {
    const tokens = options.tokens ?? 1;
    const signal = options.signal;
    if (tokens > this.#burstSize) {
      this.hooks.invoke('onTokenDepleted', () => {
        const result = this.onTokenDepleted();
        return result;
      });
      throw new TokenBucketExhaustedError();
    }
    while (true) {
      this.#refill();
      if (this.#tokens >= tokens) {
        this.#tokens -= tokens;
        this.#invokeOnTokenAcquired(tokens);
        return;
      }
      const waitMs = Math.ceil((tokens - this.#tokens) / this.#requestsPerSecond * 1000);
      const outcome = await RaceTimeout.wait(waitMs, signal);
      if (outcome === 'aborted') {
        throw signal?.reason;
      }
    }
  }

  /**
   * Fires after `consume()` or `waitForToken()` successfully deducts tokens.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onTokenAcquired(_count: number): void {}

  /**
   * Fires when `consume()` finds insufficient tokens, before throwing.
   * Must not throw or block.
   */
  protected onTokenDepleted(): void {}

  /**
   * Fires when the internal refill adds tokens due to elapsed time.
   * Only fires when `added > 0`. Must not throw or block.
   */
  protected onRefill(_added: number): void {}

  #invokeOnTokenAcquired(tokens: number): void {
    this.hooks.invoke('onTokenAcquired', () => {
      const result = this.onTokenAcquired(tokens);
      return result;
    });
  }

  #refill(): void {
    const now = this.#clock();
    const elapsed = now - this.#lastRefill;
    const newTokens = (elapsed / 1000) * this.#requestsPerSecond;
    const previousTokens = this.#tokens;
    this.#tokens = Math.min(this.#burstSize, this.#tokens + newTokens);
    this.#lastRefill = now;
    const added = this.#tokens - previousTokens;
    if (added > 0) {
      this.hooks.invoke('onRefill', () => {
        const result = this.onRefill(added);
        return result;
      });
    }
  }
}
