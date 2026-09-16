/**
 * Per-key rate limiting composing cache and resilience
 */

import type { LruCacheOptionsEntity } from '@studnicky/cache/entities';
import type { TokenBucketOptionsInterface } from '@studnicky/resilience/interfaces';

import { LruCache } from '@studnicky/cache/node';
import { EntityCompiler } from '@studnicky/entity/node';
import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { RateLimitConsumptionEntity } from '@studnicky/resilience/entities';
import { RateLimiterClock, ResilienceConfigError, TokenBucket } from '@studnicky/resilience/node';
import { Predicates } from '@studnicky/types/node';

import type { KeyedRateLimiterCreateConfigInterface } from './interfaces/KeyedRateLimiterCreateConfigInterface.js';
import type { KeyedRateLimiterStrategyConfigInterface } from './interfaces/KeyedRateLimiterStrategyConfigInterface.js';
import type { RateLimiterStrategyInterface } from './interfaces/RateLimiterStrategyInterface.js';

import { KeyedRateLimiterDefaultOptionsEntity } from './entities/KeyedRateLimiterDefaultOptionsEntity.js';
import { KeyedRateLimiterRegistryOptionsEntity } from './entities/KeyedRateLimiterRegistryOptionsEntity.js';
import { RateLimitRequestEntity } from './entities/RateLimitRequestEntity.js';
import { KeyedRateLimiterBoundaryError } from './errors/KeyedRateLimiterBoundaryError.js';
import { KeyedRateLimiterConfigError } from './errors/KeyedRateLimiterConfigError.js';

interface KeyedRateLimiterDepsInterface<TStrategy extends RateLimiterStrategyInterface> {
  'cacheOptions': LruCacheOptionsEntity.Type;
  'factory': (this: KeyedRateLimiter<TStrategy>, key: string) => TStrategy;
  'tokenBucketOptions': TokenBucketOptionsInterface | undefined;
}

interface KeyedRateLimiterSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

/** Default `maximumKeys` when a caller omits it — bounds unbounded key growth without requiring every caller to pick a number. */
const DEFAULT_MAXIMUM_KEYS = 10_000;

/**
 * Isolates observer failures from successful consumption and the underlying
 * exhaustion errors reported by the limiter.
 */
class KeyedRateLimiterFailureIsolatingHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}

/**
 * Rate-limits operations independently per string key (per user ID, per IP,
 * per API token, ...) by lazily creating one strategy instance per key and
 * evicting idle keys via a composed `@studnicky/cache` `LruCache`.
 *
 * Generic over `TStrategy extends RateLimiterStrategyInterface` — a purely
 * structural seam (`consume(tokens?)` / `waitForToken(options?)`), never
 * coupled to `TokenBucket` by import or inheritance. `create()` accepts either
 * the default `TokenBucket` configuration or a factory for any other algorithm
 * (e.g. a future
 * `SlidingWindowLimiter`) slots into by supplying a factory that returns an
 * object matching `RateLimiterStrategyInterface` — no second wrapper class needed.
 *
 * The internal cache and strategies are owned delegates. `KeyedRateLimiter`
 * reports successful consumption through its own canonical result and hook surface.
 *
 * @example Default TokenBucket-per-key
 * ```typescript
 * const limiter = KeyedRateLimiter.create({ requestsPerSecond: 10, burstSize: 20 });
 *
 * limiter.consume('user-42');
 * await limiter.waitForToken('user-42');
 * ```
 *
 * @example Generic strategy extension point
 * ```typescript
 * import { KeyedRateLimiter } from '@studnicky/keyed-rate-limiter/node';
 * import { SlidingWindowLimiter } from '@studnicky/resilience/node';
 *
 * const limiter = KeyedRateLimiter.create({
 *   factory: () => SlidingWindowLimiter.create({
 *     algorithm: 'log',
 *     limit: 100,
 *     windowMs: 1_000
 *   })
 * });
 *
 * limiter.consume('user-42');
 * ```
 */
export class KeyedRateLimiter<TStrategy extends RateLimiterStrategyInterface = TokenBucket> {
  static #createCacheOptions(options: KeyedRateLimiterRegistryOptionsEntity.Type): LruCacheOptionsEntity.Type {
    return {
      'capacity': options.maximumKeys ?? DEFAULT_MAXIMUM_KEYS,
      ...(options.keyIdleTtlMs === undefined ? {} : { 'ttlMs': options.keyIdleTtlMs })
    };
  }

  static readonly #OwnedCache = class KeyedRateLimiterCache<
    TOwnerStrategy extends RateLimiterStrategyInterface
  > extends LruCache<string, TOwnerStrategy> {
    readonly #hookInvoker: HookInvoker;
    readonly #notifyKeyEviction: (key: string) => void;

    constructor(
      hookInvoker: HookInvoker,
      notifyKeyEviction: (key: string) => void,
      options: LruCacheOptionsEntity.Type
    ) {
      super(options);
      this.#hookInvoker = hookInvoker;
      this.#notifyKeyEviction = notifyKeyEviction;
    }

    protected override onEvict(key: string, reason: 'capacity'): void {
      super.onEvict(key, reason);
      this.#hookInvoker.invoke('onKeyEvicted', () => {
        const result = this.#notifyKeyEviction(key);
        return result;
      });
    }

    protected override onExpire(key: string): void {
      super.onExpire(key);
      this.#hookInvoker.invoke('onKeyEvicted', () => {
        const result = this.#notifyKeyEviction(key);
        return result;
      });
    }

    protected override onDelete(key: string): void {
      super.onDelete(key);
      this.#hookInvoker.invoke('onKeyEvicted', () => {
        const result = this.#notifyKeyEviction(key);
        return result;
      });
    }
  };


  /**
   * Creates a `KeyedRateLimiter` whose default factory constructs one
   * `TokenBucket` per key from `requestsPerSecond`/`burstSize`/`clock`.
   *
   * @param config - `{requestsPerSecond, burstSize, maximumKeys?, keyIdleTtlMs?, clock?}`
   * @returns New `KeyedRateLimiter<TokenBucket>` instance
   */
  static create<TInstance extends KeyedRateLimiter<TokenBucket> = KeyedRateLimiter<TokenBucket>>(
    this: KeyedRateLimiterSubclassInterface<TInstance>,
    config: KeyedRateLimiterCreateConfigInterface
  ): TInstance;
  static create<
    TStrategy extends RateLimiterStrategyInterface,
    TInstance extends KeyedRateLimiter<TStrategy> = KeyedRateLimiter<TStrategy>
  >(
    this: KeyedRateLimiterSubclassInterface<TInstance>,
    config: KeyedRateLimiterStrategyConfigInterface<TStrategy>
  ): TInstance;
  static create<
    TStrategy extends RateLimiterStrategyInterface,
    TInstance extends KeyedRateLimiter<TokenBucket> | KeyedRateLimiter<TStrategy> =
      KeyedRateLimiter<TokenBucket>
  >(
    this: KeyedRateLimiterSubclassInterface<TInstance>,
    config: KeyedRateLimiterCreateConfigInterface | KeyedRateLimiterStrategyConfigInterface<TStrategy>
  ): TInstance {
    if ('factory' in config) {
      const { factory, ...registryOptions } = config;
      if (typeof factory !== 'function') {
        throw new KeyedRateLimiterConfigError('factory must be a function');
      }
      if (!KeyedRateLimiterRegistryOptionsEntity.validate(registryOptions)) {
        const messages = EntityCompiler.formatErrors(KeyedRateLimiterRegistryOptionsEntity.validate.errors);
        throw new KeyedRateLimiterConfigError(messages);
      }
      const result: unknown = Reflect.construct(this, [{
        'cacheOptions': KeyedRateLimiter.#createCacheOptions(registryOptions),
        'factory': factory,
        'tokenBucketOptions': undefined
      }]);
      if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, this)) {
        throw RuntimeError.create('KeyedRateLimiter.create() must construct a KeyedRateLimiter instance');
      }
      return result;
    }

    const { clock, ...serializableOptions } = config;
    if (!KeyedRateLimiterDefaultOptionsEntity.validate(serializableOptions)) {
      const messages = EntityCompiler.formatErrors(KeyedRateLimiterDefaultOptionsEntity.validate.errors);
      throw new KeyedRateLimiterConfigError(messages);
    }
    let verifiedClock: TokenBucketOptionsInterface['clock'];
    try {
      verifiedClock = clock === undefined ? undefined : RateLimiterClock.create(clock);
    } catch (error) {
      if (error instanceof ResilienceConfigError) {
        throw new KeyedRateLimiterConfigError(error.message);
      }
      throw error;
    }
    const tokenBucketOptions: TokenBucketOptionsInterface = {
      'burstSize': serializableOptions.burstSize,
      'requestsPerSecond': serializableOptions.requestsPerSecond,
      ...(verifiedClock === undefined ? {} : { 'clock': verifiedClock })
    };

    const result: unknown = Reflect.construct(this, [{
      'cacheOptions': KeyedRateLimiter.#createCacheOptions(serializableOptions),
      'factory': KeyedRateLimiter.#createTokenBucket,
      'tokenBucketOptions': tokenBucketOptions
    }]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('KeyedRateLimiter.create() must construct a KeyedRateLimiter instance');
    }
    return result;
  }

  readonly #cache: LruCache<string, TStrategy>;
  readonly #factory: (this: KeyedRateLimiter<TStrategy>, key: string) => TStrategy;
  readonly #tokenBucketOptions: TokenBucketOptionsInterface | undefined;
  readonly #notifyKeyEviction = (key: string): void => {
    this.onKeyEvicted(key);
  };
  protected readonly hooks: HookInvoker = new KeyedRateLimiterFailureIsolatingHookInvoker();

  protected constructor(deps: KeyedRateLimiterDepsInterface<TStrategy>) {
    this.#factory = deps.factory;
    this.#cache = new KeyedRateLimiter.#OwnedCache<TStrategy>(
      this.hooks,
      this.#notifyKeyEviction,
      deps.cacheOptions
    );
    this.#tokenBucketOptions = deps.tokenBucketOptions;
  }

  /**
   * Consumes `tokens` from `key`'s strategy, lazily creating it on first use.
   *
   * @param key - The rate-limited entity (user ID, IP, API token, ...)
   * @param tokens - Units to consume; defaults to the strategy's own default (usually 1)
   * @throws Whatever the underlying strategy's `consume()` throws when exhausted
   *   (`TokenBucketExhaustedError` for the default `TokenBucket` path)
   */
  consume(
    key: RateLimitRequestEntity.Type['key'],
    tokens?: RateLimitRequestEntity.Type['tokens']
  ): RateLimitConsumptionEntity.Type {
    const request = this.#intakeRequest(key, tokens);
    const strategy = this.#resolveStrategy(request.key);

    try {
      const result = this.#intakeConsumption(strategy.consume(request.tokens));
      this.hooks.invoke('onTokenAcquired', () => {
        const hookResult = this.onTokenAcquired(request.key, result);
        return hookResult;
      });
      return result;
    } catch (error) {
      this.hooks.invoke('onLimitExceeded', () => {
        const result = this.onLimitExceeded(request.key);
        return result;
      });
      throw error;
    }
  }

  /**
   * Waits until `key`'s strategy has `tokens` available, then consumes them.
   * Lazily creates the strategy on first use.
   *
   * @param key - The rate-limited entity
   * @param options - `{signal?, tokens?}`, forwarded to the underlying strategy
   */
  async waitForToken(
    key: RateLimitRequestEntity.Type['key'],
    options?: {
      'signal'?: AbortSignal;
      'tokens'?: RateLimitRequestEntity.Type['tokens'];
    }
  ): Promise<RateLimitConsumptionEntity.Type> {
    const request = this.#intakeRequest(key, options?.tokens);
    const strategy = this.#resolveStrategy(request.key);
    const strategyOptions = options === undefined
      ? undefined
      : {
        ...(options.signal === undefined ? {} : { 'signal': options.signal }),
        ...(request.tokens === undefined ? {} : { 'tokens': request.tokens })
      };
    const result = this.#intakeConsumption(await strategy.waitForToken(strategyOptions));
    this.hooks.invoke('onTokenAcquired', () => {
      const hookResult = this.onTokenAcquired(request.key, result);
      return hookResult;
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override in a subclass to observe
  // per-key rate-limiting semantics without coupling this class to any
  // logging/metrics library. Hook failures are isolated from limiter behavior.
  // ---------------------------------------------------------------------------

  /** Fires when a key is seen for the first time (or re-seen after eviction) and its strategy is lazily created. */
  protected onKeyCreated(_key: string): void {}

  /**
   * Fires when the internal `LruCache` removes a key's strategy — capacity
   * eviction (`onEvict`), idle TTL expiry (`onExpire`), and explicit internal
   * deletion (`onDelete`) all route here, since each is a form of "this key's
   * strategy is gone; the next call recreates it."
   */
  protected onKeyEvicted(_key: string): void {}

  /** Fires when `key`'s strategy `consume()` throws, before the error propagates. */
  protected onLimitExceeded(_key: string): void {}

  /** Fires after every successful strategy consumption, including factory-supplied strategies. */
  protected onTokenAcquired(
    _key: string,
    _result: RateLimitConsumptionEntity.Type
  ): void {}

  #intakeRequest(key: unknown, tokens: unknown): RateLimitRequestEntity.Type {
    try {
      const result = RateLimitRequestEntity.intake(
        tokens === undefined ? { 'key': key } : { 'key': key, 'tokens': tokens }
      );
      return result;
    } catch (error) {
      throw new KeyedRateLimiterBoundaryError(
        'Rate-limit requests require a non-empty string key and positive finite tokens when supplied.',
        error
      );
    }
  }

  #intakeConsumption(value: RateLimitConsumptionEntity.Type): RateLimitConsumptionEntity.Type {
    try {
      const result = RateLimitConsumptionEntity.intake(value);
      return result;
    } catch (error) {
      throw new KeyedRateLimiterBoundaryError(
        'Rate-limit strategies must return a valid consumption result.',
        error
      );
    }
  }

  #assertStrategy(strategy: TStrategy): void {
    try {
      if (
        !Predicates.isObjectLike(strategy)
        || typeof strategy.consume !== 'function'
        || typeof strategy.waitForToken !== 'function'
      ) {
        throw new KeyedRateLimiterBoundaryError(
          'Rate-limit strategy factories must return an object with callable consume() and waitForToken() methods.'
        );
      }
    } catch (error) {
      if (error instanceof KeyedRateLimiterBoundaryError) {
        throw error;
      }
      throw new KeyedRateLimiterBoundaryError(
        'Rate-limit strategy factories must return an object with callable consume() and waitForToken() methods.',
        error
      );
    }
  }

  #resolveStrategy(key: string): TStrategy {
    const cached = this.#cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const strategy = this.#factory(key);
    this.#assertStrategy(strategy);
    this.#cache.set(key, strategy);
    this.hooks.invoke('onKeyCreated', () => {
      const result = this.onKeyCreated(key);
      return result;
    });
    return strategy;
  }

  static #createTokenBucket(this: KeyedRateLimiter<TokenBucket>): TokenBucket {
    const options = this.#tokenBucketOptions;
    if (options === undefined) {
      throw RuntimeError.create('Default token bucket options are unavailable.');
    }
    const result = TokenBucket.create(options);
    return result;
  }
}
