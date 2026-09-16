/** Token bucket rate limiter; consume() throws when exhausted, waitForToken() blocks until available. */
import { SchemaIntakeError } from '@studnicky/entity/node';
import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { RaceTimeout } from '@studnicky/signal/node';
import { Predicates } from '@studnicky/types/node';

import type { RateLimitConsumptionEntity } from './entities/RateLimitConsumptionEntity.js';
import type { TokenBucketOptionsInterface } from './interfaces/TokenBucketOptionsInterface.js';

import { TokenBucketOptionsEntity } from './entities/TokenBucketOptionsEntity.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';
import { RateLimiterClock } from './RateLimiterClock.js';
import { TokenBucketExhaustedError } from './TokenBucketExhaustedError.js';

interface TokenBucketSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
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
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf(result, resolveSubclassConstructor())) {
      throw RuntimeError.create('TokenBucket.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options: TokenBucketOptionsInterface) {
    this.hooks = new TokenBucket.#OwnedHookInvoker();
    const { clock = Date.now, ...serializableOptions } = options;
    let schemaOptions: TokenBucketOptionsEntity.Type;
    try {
      schemaOptions = TokenBucketOptionsEntity.intake(serializableOptions);
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw new ResilienceConfigError(error.message);
      }
      throw error;
    }
    this.#requestsPerSecond = schemaOptions.requestsPerSecond;
    this.#burstSize = schemaOptions.burstSize;
    this.#clock = RateLimiterClock.create(clock);
    this.#tokens = schemaOptions.burstSize;
    this.#lastRefill = this.#clock();
  }

  get available(): number {
    this.#refill();
    return this.#tokens;
  }

  /** Throws TokenBucketExhaustedError if no token available. */
  consume(tokens = 1): RateLimitConsumptionEntity.Type {
    const requestedTokens = this.#resolveTokens(tokens);
    this.#refill();
    if (this.#tokens < requestedTokens) {
      this.hooks.invoke('onTokenDepleted', () => {
        const result = this.onTokenDepleted();
        return result;
      });
      throw new TokenBucketExhaustedError();
    }
    const result = this.#acquire(requestedTokens);
    return result;
  }

  /**
   * Wait until tokens are available, then consume.
   * Throws TokenBucketExhaustedError immediately if `tokens` exceeds burstSize (can never be satisfied).
   */
  async waitForToken(
    options: { 'signal'?: AbortSignal; 'tokens'?: number } = {}
  ): Promise<RateLimitConsumptionEntity.Type> {
    const tokens = this.#resolveTokens(options.tokens);
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
        const result = this.#acquire(tokens);
        return result;
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

  #resolveTokens(tokens?: number): number {
    const result = tokens ?? 1;
    if (!Number.isFinite(result) || result <= 0) {
      throw new ResilienceConfigError('tokens must be a positive finite number');
    }
    return result;
  }

  #acquire(tokens: number): RateLimitConsumptionEntity.Type {
    this.#tokens -= tokens;
    this.#invokeOnTokenAcquired(tokens);
    return { 'consumedTokens': tokens, 'remainingTokens': this.#tokens };
  }

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
