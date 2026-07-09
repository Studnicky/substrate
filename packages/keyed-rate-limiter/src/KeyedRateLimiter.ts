/**
 * Per-key rate limiting composing cache and resilience
 */

import type { LruCacheOptionsEntity } from '@studnicky/cache';
import type { TokenBucketOptionsInterface } from '@studnicky/resilience';

import { LruCache } from '@studnicky/cache';
import { TokenBucket } from '@studnicky/resilience';

import type { RateLimiterStrategyType } from './RateLimiterStrategyType.js';
import type { KeyedRateLimiterCreateConfigType } from './types/KeyedRateLimiterCreateConfigType.js';
import type { KeyedRateLimiterStrategyConfigType } from './types/KeyedRateLimiterStrategyConfigType.js';

import { KeyedRateLimiterBuilder } from './KeyedRateLimiterBuilder.js';

type KeyedRateLimiterDepsType<TStrategy extends RateLimiterStrategyType> = {
  'cache': LruCache<string, TStrategy>;
  'factory': (key: string) => TStrategy;
};

/** Default `maxKeys` when a caller omits it — bounds unbounded key growth without requiring every caller to pick a number. */
const DEFAULT_MAX_KEYS = 10_000;

/**
 * Rate-limits operations independently per string key (per user ID, per IP,
 * per API token, ...) by lazily creating one strategy instance per key and
 * evicting idle keys via a composed `@studnicky/cache` `LruCache`.
 *
 * Generic over `TStrategy extends RateLimiterStrategyType` — a purely
 * structural seam (`consume(tokens?)` / `waitForToken(options?)`), never
 * coupled to `TokenBucket` by import or inheritance. `create()` is the
 * convenience path that composes a `TokenBucket` per key; `createWithStrategy()`
 * is the generic extension point any other algorithm (e.g. a future
 * `SlidingWindowLimiter`) slots into by supplying a factory that returns an
 * object matching `RateLimiterStrategyType` — no second wrapper class needed.
 *
 * Composes the internal `LruCache` rather than exposing it unmodified: the
 * cache is built as an anonymous subclass that delegates its own
 * `onEvict`/`onExpire`/`onDelete` hooks to `KeyedRateLimiter`'s own
 * `onKeyEvicted` hook, the same delegation technique `@studnicky/paginator`'s
 * `Paginator` and `@studnicky/idempotency-guard`'s `IdempotencyGuard` use for
 * their own internally-composed instances.
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
 * const limiter = KeyedRateLimiter.createWithStrategy({
 *   factory: (key) => MySlidingWindowLimiter.create({ windowMs: 1000, limit: 100 })
 * });
 * ```
 */
export class KeyedRateLimiter<TStrategy extends RateLimiterStrategyType = TokenBucket> {
  /**
   * Creates a `KeyedRateLimiter` whose default factory constructs one
   * `TokenBucket` per key from `requestsPerSecond`/`burstSize`/`clock`.
   *
   * @param config - `{requestsPerSecond, burstSize, maxKeys?, keyIdleTtlMs?, clock?}`
   * @returns New `KeyedRateLimiter<TokenBucket>` instance
   */
  static create(config: KeyedRateLimiterCreateConfigType): KeyedRateLimiter<TokenBucket> {
    // Built as an anonymous TokenBucket subclass (rather than plain
    // `TokenBucket.create()`) so its own `onTokenAcquired` hook can delegate
    // to `KeyedRateLimiter#onTokenAcquired(key, count)` — the same
    // instance-delegation technique used for the composed `LruCache` below,
    // applied here because this is the one path where the strategy type
    // (`TokenBucket`) and its hook surface are both known at construction
    // time. `createWithStrategy()` cannot make this same guarantee for an
    // arbitrary caller-supplied strategy — see `onTokenAcquired`'s doc comment.
    const limiterRef: { 'current': KeyedRateLimiter<TokenBucket> | undefined } = { 'current': undefined };
    const factory = (key: string): TokenBucket => {
      const result = new (class extends TokenBucket {
        // Explicit public constructor — a class extending a protected-constructor
        // base inherits "protected" implicitly unless it declares its own,
        // same as `@studnicky/idempotency-guard`'s anonymous `Coalesce` subclass.
        constructor(options: TokenBucketOptionsInterface) { super(options); }

        protected override onTokenAcquired(count: number): void {
          super.onTokenAcquired(count);
          if (limiterRef.current !== undefined) {
            try {
              limiterRef.current.onTokenAcquired(key, count);
            } catch {}
          }
        }
      })({
        'burstSize': config.burstSize,
        'requestsPerSecond': config.requestsPerSecond,
        ...(config.clock !== undefined ? { 'clock': config.clock } : {})
      });
      return result;
    };

    // Calls through `this` (not the hardcoded class name) so a subclass
    // calling its own inherited `create()` still routes through its own
    // inherited `createWithStrategy()`, preserving the `new this(...)`
    // polymorphism below all the way out to the subclass constructor.
    const limiter = this.createWithStrategy<TokenBucket>({
      'factory': factory,
      ...(config.maxKeys !== undefined ? { 'maxKeys': config.maxKeys } : {}),
      ...(config.keyIdleTtlMs !== undefined ? { 'keyIdleTtlMs': config.keyIdleTtlMs } : {})
    });
    limiterRef.current = limiter;

    return limiter;
  }

  /**
   * Creates a `KeyedRateLimiter` over any factory producing an object that
   * structurally matches `RateLimiterStrategyType` — the extension point a
   * future rate-limiting algorithm slots into without a second wrapper class.
   *
   * @param config - `{factory, maxKeys?, keyIdleTtlMs?}`
   * @returns New `KeyedRateLimiter<TStrategy>` instance
   */
  static createWithStrategy<TStrategy extends RateLimiterStrategyType = TokenBucket>(
    config: KeyedRateLimiterStrategyConfigType<TStrategy>
  ): KeyedRateLimiter<TStrategy> {
    const limiterRef: { 'current': KeyedRateLimiter<TStrategy> | undefined } = { 'current': undefined };

    const cache = new (class extends LruCache<string, TStrategy> {
      // Explicit public constructor — see the same note on the anonymous
      // `TokenBucket` subclass in `create()` above.
      constructor(options: LruCacheOptionsEntity.Type) { super(options); }

      protected override onEvict(key: string, _reason: 'capacity'): void {
        super.onEvict(key, _reason);
        if (limiterRef.current !== undefined) {
          try {
            limiterRef.current.onKeyEvicted(key);
          } catch {}
        }
      }

      protected override onExpire(key: string): void {
        super.onExpire(key);
        if (limiterRef.current !== undefined) {
          try {
            limiterRef.current.onKeyEvicted(key);
          } catch {}
        }
      }

      protected override onDelete(key: string): void {
        super.onDelete(key);
        if (limiterRef.current !== undefined) {
          try {
            limiterRef.current.onKeyEvicted(key);
          } catch {}
        }
      }
    })({
      'capacity': config.maxKeys ?? DEFAULT_MAX_KEYS,
      ...(config.keyIdleTtlMs !== undefined ? { 'ttlMs': config.keyIdleTtlMs } : {})
    });

    // `new this(...)` (not `new KeyedRateLimiter(...)`) so a subclass calling
    // its own inherited `createWithStrategy()`/`create()` gets back an
    // instance of ITS OWN class — the same polymorphic-`this` idiom
    // `@studnicky/cache`'s `LruCache.create()` and `@studnicky/resilience`'s
    // `TokenBucket.create()` use, needed here so subclass hook overrides
    // (`onKeyCreated`/`onKeyEvicted`/`onLimitExceeded`/`onTokenAcquired`)
    // actually fire.
    const limiter = new this({ 'cache': cache, 'factory': config.factory });
    limiterRef.current = limiter;

    return limiter;
  }

  static builder(): KeyedRateLimiterBuilder {
    const result = KeyedRateLimiterBuilder.create((config) => {
      const limiter = KeyedRateLimiter.create(config);
      return limiter;
    });
    return result;
  }

  readonly #cache: LruCache<string, TStrategy>;
  readonly #factory: (key: string) => TStrategy;

  protected constructor(deps: KeyedRateLimiterDepsType<TStrategy>) {
    this.#factory = deps.factory;
    this.#cache = deps.cache;
  }

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  /**
   * Consumes `tokens` from `key`'s strategy, lazily creating it on first use.
   *
   * @param key - The rate-limited entity (user ID, IP, API token, ...)
   * @param tokens - Units to consume; defaults to the strategy's own default (usually 1)
   * @throws Whatever the underlying strategy's `consume()` throws when exhausted
   *   (`TokenBucketExhaustedError` for the default `TokenBucket` path)
   */
  consume(key: string, tokens?: number): void {
    const strategy = this.#resolveStrategy(key);

    try {
      strategy.consume(tokens);
    } catch (error) {
      this.#invokeHook(() => {
        this.onLimitExceeded(key);
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
  async waitForToken(key: string, options?: { 'signal'?: AbortSignal; 'tokens'?: number }): Promise<void> {
    const strategy = this.#resolveStrategy(key);
    await strategy.waitForToken(options);
  }

  /** The composed `LruCache<string, TStrategy>` instance — never a copy or wrapper. */
  getCache(): LruCache<string, TStrategy> {
    return this.#cache;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override in a subclass to observe
  // per-key rate-limiting semantics without coupling this class to any
  // logging/metrics library. Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires when a key is seen for the first time (or re-seen after eviction) and its strategy is lazily created. */
  protected onKeyCreated(_key: string): void {}

  /**
   * Fires when the internal `LruCache` removes a key's strategy — capacity
   * eviction (`onEvict`), idle TTL expiry (`onExpire`), or a caller calling
   * `getCache().delete(key)` directly (`onDelete`) all route here, since each
   * is a form of "this key's strategy is gone; the next call recreates it."
   */
  protected onKeyEvicted(_key: string): void {}

  /** Fires when `key`'s strategy `consume()` throws, before the error propagates. */
  protected onLimitExceeded(_key: string): void {}

  /**
   * Fires after a successful token acquisition for `key`, but ONLY on the
   * default `create()` path — the per-key `TokenBucket` is wrapped to
   * delegate its own `onTokenAcquired` hook here. `createWithStrategy()`
   * cannot make this guarantee generically: `RateLimiterStrategyType` has no
   * hook surface of its own, so there is no structural seam to delegate
   * through for an arbitrary caller-supplied strategy. A `createWithStrategy()`
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
    this.#invokeHook(() => {
      this.onKeyCreated(key);
    });
    return strategy;
  }
}
