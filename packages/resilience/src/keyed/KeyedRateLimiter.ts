/**
 * Per-key rate limiting composing cache and resilience
 */

import type { LruCacheOptionsEntity } from '@studnicky/cache/entities';

import { MonotonicNow } from '@studnicky/clock/monotonic-now';
import { ClockError } from '@studnicky/clock/node';

import { BaseError, CallerFault, EntityCompiler, HookInvoker, LruCache, Predicates, RuntimeError } from '#runtime';

import type { RateLimitConsumptionInterface } from '../interfaces/RateLimitConsumptionInterface.js';
import type { TokenBucketOptionsInterface } from '../interfaces/TokenBucketOptionsInterface.js';
import type { KeyedRateLimiterCreateConfigInterface } from './interfaces/KeyedRateLimiterCreateConfigInterface.js';
import type { KeyedRateLimiterStrategyConfigInterface } from './interfaces/KeyedRateLimiterStrategyConfigInterface.js';
import type { RateLimiterStrategyInterface } from './interfaces/RateLimiterStrategyInterface.js';

import { RateLimitConsumptionEntity } from '../entities/RateLimitConsumptionEntity.js';
import { TokenBucket } from '../TokenBucket.js';
import { KeyedRateLimiterDefaultOptionsEntity } from './entities/KeyedRateLimiterDefaultOptionsEntity.js';
import { KeyedRateLimiterRegistryOptionsEntity } from './entities/KeyedRateLimiterRegistryOptionsEntity.js';
import { RateLimitRequestEntity } from './entities/RateLimitRequestEntity.js';
import { KeyedRateLimiterBoundaryError } from './errors/KeyedRateLimiterBoundaryError.js';
import { KeyedRateLimiterConfigError } from './errors/KeyedRateLimiterConfigError.js';

class KeyedRateLimiterDependencies<TStrategy extends RateLimiterStrategyInterface> {
  constructor(
    readonly cacheOptions: LruCacheOptionsEntity.InputType,
    readonly factory: (this: KeyedRateLimiter<TStrategy>, key: string) => TStrategy,
    readonly tokenBucketOptions: TokenBucketOptionsInterface | undefined
  ) {}
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
 * import { KeyedRateLimiter } from '@studnicky/resilience/keyed';
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
  static #createCacheOptions(options: KeyedRateLimiterRegistryOptionsEntity.Type): LruCacheOptionsEntity.InputType {
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
      options: LruCacheOptionsEntity.InputType
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
   * @param config - Default TokenBucket options or a per-key strategy factory with registry options.
   * @returns A limiter using TokenBucket for default options or the factory-supplied strategy.
   */
  static create<TStrategy extends RateLimiterStrategyInterface>(
    config: KeyedRateLimiterCreateConfigInterface | KeyedRateLimiterStrategyConfigInterface<TStrategy>
  ): KeyedRateLimiter<TokenBucket> | KeyedRateLimiter<TStrategy> {
    if ('factory' in config) {
      return new KeyedRateLimiter<TStrategy>(KeyedRateLimiter.createFactoryDependencies(config));
    }
    return new KeyedRateLimiter<TokenBucket>(KeyedRateLimiter.createDefaultDependencies(config));
  }

  protected static createFactoryDependencies<TStrategy extends RateLimiterStrategyInterface>(
    config: KeyedRateLimiterStrategyConfigInterface<TStrategy>
  ): KeyedRateLimiterDependencies<TStrategy> {
    const { factory, ...registryOptions } = config;
    if (typeof factory !== 'function') {
      throw new KeyedRateLimiterConfigError('factory must be a function');
    }
    if (!KeyedRateLimiterRegistryOptionsEntity.validate(registryOptions)) {
      const messages = EntityCompiler.formatErrors(KeyedRateLimiterRegistryOptionsEntity.validate.errors);
      throw new KeyedRateLimiterConfigError(messages);
    }
    return new KeyedRateLimiterDependencies(
      KeyedRateLimiter.#createCacheOptions(registryOptions),
      factory,
      undefined
    );
  }

  protected static createDefaultDependencies(
    config: KeyedRateLimiterCreateConfigInterface
  ): KeyedRateLimiterDependencies<TokenBucket> {
    const { clock, ...serializableOptions } = config;
    if (!KeyedRateLimiterDefaultOptionsEntity.validate(serializableOptions)) {
      const messages = EntityCompiler.formatErrors(KeyedRateLimiterDefaultOptionsEntity.validate.errors);
      throw new KeyedRateLimiterConfigError(messages);
    }
    let verifiedClock: TokenBucketOptionsInterface['clock'];
    try {
      verifiedClock = clock === undefined ? undefined : MonotonicNow.create(clock);
    } catch (error) {
      throw new KeyedRateLimiterConfigError(error instanceof ClockError ? error.message : 'KeyedRateLimiter clock validation failed', error);
    }
    const tokenBucketOptions: TokenBucketOptionsInterface = {
      'burstSize': serializableOptions.burstSize,
      'requestsPerSecond': serializableOptions.requestsPerSecond,
      ...(verifiedClock === undefined ? {} : { 'clock': verifiedClock })
    };

    return new KeyedRateLimiterDependencies(
      KeyedRateLimiter.#createCacheOptions(serializableOptions),
      KeyedRateLimiter.#createTokenBucket,
      tokenBucketOptions
    );
  }
  readonly #cache: LruCache<string, TStrategy>;
  readonly #factory: (this: KeyedRateLimiter<TStrategy>, key: string) => TStrategy;
  readonly #tokenBucketOptions: TokenBucketOptionsInterface | undefined;
  readonly #notifyKeyEviction = (key: string): void => {
    this.onKeyEvicted(key);
  };
  protected readonly hooks: HookInvoker = new KeyedRateLimiterFailureIsolatingHookInvoker();

  protected constructor(deps: KeyedRateLimiterDependencies<TStrategy>) {
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
    key: unknown,
    tokens?: unknown
  ): RateLimitConsumptionEntity.Type {
    const request = this.#intakeRequest(key, tokens);
    const strategy = this.#resolveStrategy(request.key);

    let result: RateLimitConsumptionEntity.Type;
    try {
      result = this.#intakeConsumption(strategy.consume(request.tokens));
    } catch (error) {
      this.hooks.invoke('onLimitExceeded', () => {
        const hookResult = this.onLimitExceeded(request.key);
        return hookResult;
      });
      if (error instanceof BaseError) {
        throw error;
      }
      CallerFault.propagate(error);
    }
    this.hooks.invoke('onTokenAcquired', () => {
      const hookResult = this.onTokenAcquired(request.key, result);
      return hookResult;
    });
    return result;
  }

  /**
   * Waits until `key`'s strategy has `tokens` available, then consumes them.
   * Lazily creates the strategy on first use.
   *
   * @param key - The rate-limited entity
   * @param options - `{signal?, tokens?}`, forwarded to the underlying strategy
   */
  async waitForToken(
    key: unknown,
    options?: {
      'signal'?: AbortSignal;
      'tokens'?: unknown;
    }
  ): Promise<RateLimitConsumptionEntity.Type> {
    const request = this.#intakeRequest(key, options?.tokens);
    const strategy = this.#resolveStrategy(request.key);
    const strategyOptions = options === undefined
      ? undefined
      : {
        ...(options.signal === undefined ? {} : { 'signal': options.signal }),
        'tokens': request.tokens
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

  #intakeConsumption(value: RateLimitConsumptionInterface): RateLimitConsumptionEntity.Type {
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
