/** Token bucket rate limiter; consume() throws when exhausted, waitForToken() blocks until available. */

import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { RaceTimeout } from '@studnicky/signal';

import type { TokenBucketOptionsInterface } from './interfaces/TokenBucketOptionsInterface.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';
import { TokenBucketBuilder } from './TokenBucketBuilder.js';
import { TokenBucketExhaustedError } from './TokenBucketExhaustedError.js';

/**
 * Delegates `TokenBucket`'s hook-invocation failures back to the owning
 * bucket's own `hookErrors` array. Hoisted to module scope so V8 compiles
 * this class once rather than per `TokenBucket` instantiation.
 */
class TokenBucketHookDelegate extends HookInvoker {
  constructor(private readonly recordFailure: (error: HookInvocationError) => void) {
    super();
  }

  /**
   * A broken hook must not disrupt token consumption or refill: record the
   * failure and hand back the sentinel `invoke` expects instead of letting
   * `HookInvoker`'s default (throwing) behavior propagate.
   */
  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.recordFailure(new HookInvocationError(hookName, cause));
    return undefined as T;
  }
}

export class TokenBucket {
  readonly #requestsPerSecond: number;
  readonly #burstSize: number;
  readonly #clock: () => number;
  #tokens: number;
  #lastRefill: number;

  /**
   * Errors raised by lifecycle hook overrides, recorded by `onHookError`
   * instead of propagating out of consume/waitForToken/refill.
   */
  protected readonly hookErrors: HookInvocationError[] = [];

  /** Invokes lifecycle hooks, recording failures into `hookErrors` instead of throwing. */
  protected readonly hooks: HookInvoker;

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
    this.hooks = new TokenBucketHookDelegate((error) => { this.hookErrors.push(error); });
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
        this.hooks.invoke('onTokenAcquired', () => {
          const result = this.onTokenAcquired(tokens);
          return result;
        });
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

  #refill(): void {
    const now = this.#clock();
    const elapsed = now - this.#lastRefill;
    const newTokens = (elapsed / 1000) * this.#requestsPerSecond;
    const prev = this.#tokens;
    this.#tokens = Math.min(this.#burstSize, this.#tokens + newTokens);
    this.#lastRefill = now;
    const added = this.#tokens - prev;
    if (added > 0) {
      this.hooks.invoke('onRefill', () => {
        const result = this.onRefill(added);
        return result;
      });
    }
  }
}
