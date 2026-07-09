/**
 * Pure function memoization composing cache and concurrency
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';

import type { MemoizeOptionsType } from './types/MemoizeOptionsType.js';

import { MemoizeBuilder } from './MemoizeBuilder.js';

type MemoizeDepsType<TArgs extends unknown[], TResult> = {
  'cache': LruCache<string, TResult>;
  'coalesce': Coalesce<TResult>;
  'fn': (...args: TArgs) => TResult | Promise<TResult>;
  'keyFn': (...args: TArgs) => string;
};

/**
 * Composes `@studnicky/cache` (`LruCache`) and `@studnicky/concurrency`
 * (`Coalesce`) into pure function memoization keyed by a caller-supplied key
 * derivation function.
 *
 * `call(...args)` derives `key = keyFn(...args)` and checks the composed
 * `LruCache`:
 * - Entry present → the cached result is returned without re-invoking `fn`
 *   (`onMemoHit`).
 * - No entry → the call runs through the composed `Coalesce` so concurrent
 *   callers sharing the same derived key share one invocation of `fn`: the
 *   leader fires `onMemoMiss` before `fn` runs, followers fire
 *   `onMemoCoalesced` when they join the in-flight call. The result is
 *   cached on success.
 *
 * `Memoize` has no conflict-detection concept. Unlike
 * `@studnicky/idempotency-guard`'s `IdempotencyGuard` — which fingerprints a
 * payload alongside the cached result and throws when a key is reused for a
 * *different* payload — `Memoize` is pure memoization: the same derived key
 * always replays the cached result, with no payload fingerprint check.
 * `keyFn` is a required config field, mirroring `LruCache`'s explicit-key
 * model rather than an implicit tuple hash, which is unsound for
 * object/function arguments.
 *
 * Composes `Coalesce` rather than extending it, and delegates the internal
 * instance's `onCoalesceStart`/`onCoalesceJoin` hooks to `Memoize`'s own
 * `onMemoMiss`/`onMemoCoalesced` hooks so subclasses can observe memoization
 * semantics without reaching into the internal instance — the same
 * delegation technique `@studnicky/idempotency-guard`'s `IdempotencyGuard`
 * uses for its own `onExecute`/`onCoalesce`.
 *
 * @example Direct composition
 * ```typescript
 * const memo = Memoize.create(
 *   (userId: string) => fetchUser(userId),
 *   { keyFn: (userId) => userId, capacity: 1000, ttlMs: 60_000 }
 * );
 *
 * const user = await memo.call('user-42');
 * ```
 */
export class Memoize<TArgs extends unknown[], TResult> {
  /**
   * Creates a new Memoize wrapping `fn`.
   *
   * @param fn - Function to memoize; may return a value or a Promise
   * @param options - `{ keyFn, capacity, ttlMs?, staleMs? }` — `keyFn` is required
   * @returns New Memoize instance
   */
  static create<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => TResult | Promise<TResult>,
    options: MemoizeOptionsType<TArgs>
  ): Memoize<TArgs, TResult> {
    const cache = LruCache.create<string, TResult>({
      'capacity': options.capacity,
      ...(options.staleMs !== undefined ? { 'staleMs': options.staleMs } : {}),
      ...(options.ttlMs !== undefined ? { 'ttlMs': options.ttlMs } : {})
    });

    const Ctor = this as unknown as new (deps: MemoizeDepsType<TArgs, TResult>) => Memoize<TArgs, TResult>;

    const memoRefBox: { 'current'?: Memoize<TArgs, TResult> } = {};

    const coalesce = new (class extends Coalesce<TResult> {
      constructor() {
        super();
      }

      protected override onCoalesceStart(key: string): void {
        super.onCoalesceStart(key);
        const memo = memoRefBox.current!;
        memo.onMemoMiss(key, memo.pendingArgs!);
      }

      protected override onCoalesceJoin(key: string): void {
        super.onCoalesceJoin(key);
        const memo = memoRefBox.current!;
        memo.onMemoCoalesced(key, memo.pendingArgs!);
      }
    })();

    const result = new Ctor({
      'cache': cache,
      'coalesce': coalesce,
      'fn': fn,
      'keyFn': options.keyFn
    });

    memoRefBox.current = result;

    return result;
  }

  static builder<TArgs extends unknown[], TResult>(): MemoizeBuilder<TArgs, TResult> {
    const result = MemoizeBuilder.create<TArgs, TResult>((fn, options) => {
      const memo = Memoize.create<TArgs, TResult>(fn, options);
      return memo;
    });
    return result;
  }

  readonly #cache: LruCache<string, TResult>;
  readonly #coalesce: Coalesce<TResult>;
  readonly #fn: (...args: TArgs) => TResult | Promise<TResult>;
  readonly #keyFn: (...args: TArgs) => string;
  /**
   * Arguments for the call currently entering the composed `Coalesce`,
   * readable from its delegated `onCoalesceStart`/`onCoalesceJoin` hooks so
   * `onMemoMiss`/`onMemoCoalesced` can be fired with the caller's `args`
   * alongside `key`. Set synchronously in `call()` immediately before
   * `Coalesce#run()` is invoked; `Coalesce#run()` calls its hooks
   * synchronously (before its first `await`), so this is always current when
   * a hook reads it.
   */
  protected pendingArgs: TArgs | undefined;

  protected constructor(deps: MemoizeDepsType<TArgs, TResult>) {
    this.#cache = deps.cache;
    this.#coalesce = deps.coalesce;
    this.#fn = deps.fn;
    this.#keyFn = deps.keyFn;
    this.pendingArgs = undefined;
  }

  /**
   * Returns the memoized result for `args`, invoking the wrapped function at
   * most once per distinct derived key until the cache entry expires or is
   * invalidated.
   *
   * @param args - Arguments forwarded to the wrapped function and to `keyFn`
   * @returns The wrapped function's result — either freshly produced or replayed from cache
   */
  async call(...args: TArgs): Promise<TResult> {
    const key = this.#keyFn(...args);

    if (this.#cache.has(key)) {
      const value = this.#cache.get(key) as TResult;
      this.onMemoHit(key, args);
      return value;
    }

    this.pendingArgs = args;

    const result = await this.#coalesce.run(key, () => {
      const value = this.#fn(...args);
      return Promise.resolve(value);
    });

    this.#cache.set(key, result);

    return result;
  }

  /** Evicts the cache entry for `keyFn(...args)` so the next matching call re-invokes the wrapped function. */
  invalidate(...args: TArgs): void {
    const key = this.#keyFn(...args);
    this.#cache.delete(key);
  }

  /** Evicts every cached entry so every subsequent call re-invokes the wrapped function. */
  clear(): void {
    this.#cache.clear();
  }

  /** The composed `LruCache` instance — never a copy or wrapper. */
  getCache(): LruCache<string, TResult> {
    return this.#cache;
  }

  /** The composed `Coalesce` instance — never a copy or wrapper. */
  getCoalesce(): Coalesce<TResult> {
    return this.#coalesce;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Observe memoization semantics
  // (hit/miss/coalesced) without coupling this class to any logging/metrics
  // library. Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires when `call()` returns a cached result for `key` without re-invoking the wrapped function. */
  protected onMemoHit(_key: string, _args: TArgs): void {}

  /** Fires when `key` is genuinely new (or its entry expired) and the wrapped function is about to run. */
  protected onMemoMiss(_key: string, _args: TArgs): void {}

  /** Fires when a caller joins an in-flight invocation for `key` already running. */
  protected onMemoCoalesced(_key: string, _args: TArgs): void {}
}
