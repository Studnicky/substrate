/**
 * Per-key rate limiting composing cache and resilience
 */

import type { LruCacheOptionsEntity } from '@studnicky/cache/entities';
import type { TokenBucketOptionsInterface } from '@studnicky/resilience';

import { LruCache } from '@studnicky/cache';
import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { TokenBucket } from '@studnicky/resilience';
import { Predicates } from '@studnicky/types';

import type { RateLimitRequestEntity } from './entities/RateLimitRequestEntity.js';
import type { KeyedRateLimiterCreateConfigInterface } from './interfaces/KeyedRateLimiterCreateConfigInterface.js';
import type { KeyedRateLimiterStrategyConfigInterface } from './interfaces/KeyedRateLimiterStrategyConfigInterface.js';
import type { RateLimiterStrategyInterface } from './interfaces/RateLimiterStrategyInterface.js';


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
 * The internal cache and default token buckets are owned delegates. Each
 * delegate retains its limiter owner and routes lifecycle events directly to
 * that owner's canonical hook invoker.
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
 * const limiter = KeyedRateLimiter.create({
 *   factory: (key) => MySlidingWindowLimiter.create({ windowMs: 1000, limit: 100 })
 * });
 * ```
 */
export class KeyedRateLimiter<TStrategy extends RateLimiterStrategyInterface = TokenBucket> {
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

  static readonly #OwnedTokenBucket = class KeyedRateLimiterTokenBucket extends TokenBucket {
    readonly #key: string;
    readonly #owner: KeyedRateLimiter<TokenBucket>;

    constructor(
      owner: KeyedRateLimiter<TokenBucket>,
      key: string,
      options: TokenBucketOptionsInterface
    ) {
      super(options);
      this.#key = key;
      this.#owner = owner;
    }

    protected override onTokenAcquired(count: number): void {
      super.onTokenAcquired(count);
      this.#owner.hooks.invoke('onTokenAcquired', () => {
        const result = this.#owner.onTokenAcquired(this.#key, count);
        return result;
      });
    }
  };

  private static isConstructed<TInstance>(
    value: object,
    constructor: KeyedRateLimiterSubclassInterface<TInstance>
  ): value is object & TInstance {
    const result = value instanceof constructor;
    return result;
  }

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
    const cacheOptions: LruCacheOptionsEntity.Type = {
      'capacity': config.maximumKeys ?? DEFAULT_MAXIMUM_KEYS,
      ...(config.keyIdleTtlMs !== undefined ? { 'ttlMs': config.keyIdleTtlMs } : {})
    };

    if ('factory' in config) {
      const result: unknown = Reflect.construct(this, [{
        'cacheOptions': cacheOptions,
        'factory': config.factory,
        'tokenBucketOptions': undefined
      }]);
      if (!Predicates.isObjectLike(result) || !KeyedRateLimiter.isConstructed<TInstance>(result, this)) {
        throw RuntimeError.create('KeyedRateLimiter.create() must construct a KeyedRateLimiter instance');
      }
      return result;
    }

    const result: unknown = Reflect.construct(this, [{
      'cacheOptions': cacheOptions,
      'factory': KeyedRateLimiter.#createTokenBucket,
      'tokenBucketOptions': {
        'burstSize': config.burstSize,
        'requestsPerSecond': config.requestsPerSecond,
        ...(config.clock !== undefined ? { 'clock': config.clock } : {})
      }
    }]);
    if (!Predicates.isObjectLike(result) || !KeyedRateLimiter.isConstructed<TInstance>(result, this)) {
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
  ): void {
    const strategy = this.#resolveStrategy(key);

    try {
      strategy.consume(tokens);
    } catch (error) {
      this.hooks.invoke('onLimitExceeded', () => {
        const result = this.onLimitExceeded(key);
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
  ): Promise<void> {
    const strategy = this.#resolveStrategy(key);
    await strategy.waitForToken(options);
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

  /**
   * Fires after a successful token acquisition for `key`, but ONLY on the
   * default `create()` path — the per-key owned `TokenBucket` delegates its
   * own `onTokenAcquired` hook here. A factory-based `create()` call
   * cannot make this guarantee generically: `RateLimiterStrategyInterface` has no
   * hook surface of its own, so there is no structural seam to delegate
   * through for an arbitrary caller-supplied strategy. A factory-based `create()`
   * consumer who wants acquisition telemetry builds it into their own
   * factory's returned instance (e.g. subclass their strategy and call back
   * into their own observability, the same way `create()` does here).
   */
  protected onTokenAcquired(_key: string, _count: number): void {}

  #resolveStrategy(key: string): TStrategy {
    const cached = this.#cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const strategy = this.#factory(key);
    this.#cache.set(key, strategy);
    this.hooks.invoke('onKeyCreated', () => {
      const result = this.onKeyCreated(key);
      return result;
    });
    return strategy;
  }

  static #createTokenBucket(this: KeyedRateLimiter<TokenBucket>, key: string): TokenBucket {
    const options = this.#tokenBucketOptions;
    if (options === undefined) {
      throw RuntimeError.create('Default token bucket options are unavailable.');
    }
    const result = new KeyedRateLimiter.#OwnedTokenBucket(this, key, options);
    return result;
  }
}
