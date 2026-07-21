/**
 * Pure function memoization composing cache and concurrency
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';
import { HookInvoker } from '@studnicky/errors';

import type { CacheLookupEntity } from './entities/CacheLookupEntity.js';
import type { MemoizeOptionsInterface } from './interfaces/MemoizeOptionsInterface.js';

class MemoizeHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

interface CacheLookupInterface<T> {
  readonly 'found': CacheLookupEntity.Type['found'];
  readonly 'value': T | undefined;
}

class MemoizeCacheLookup {
  static isHit<T>(
    lookup: CacheLookupInterface<T>
  ): lookup is CacheLookupInterface<T> & { readonly 'found': true; readonly 'value': T } {
    if (!lookup.found) {
      return false;
    }
    return Object.hasOwn(lookup, 'value');
  }
}

interface MemoizeDepsInterface<TArgs extends unknown[], TResult> {
  'cache': LruCache<string, TResult>;
  'fn': (...args: TArgs) => TResult | Promise<TResult>;
  'keyFn': (...args: TArgs) => string;
}

interface MemoizeSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class MemoizeInstance {
  static belongsTo<TInstance>(
    constructor: MemoizeSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    return value instanceof constructor;
  }
}

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
  static readonly #OwnedCoalesce = class MemoizeCoalesce<
    TOwnerArgs extends unknown[],
    TOwnerResult
  > extends Coalesce<TOwnerResult> {
    readonly #owner: Memoize<TOwnerArgs, TOwnerResult>;

    constructor(owner: Memoize<TOwnerArgs, TOwnerResult>) {
      super();
      this.#owner = owner;
    }

    protected override onCoalesceStart(key: string): void {
      super.onCoalesceStart(key);
      const args = this.#owner.#pendingArgsByKey.get(key);
      if (args === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoMiss', () => {
        const hookResult = this.#owner.onMemoMiss(key, args);
        return hookResult;
      });
    }

    protected override onCoalesceJoin(key: string): void {
      super.onCoalesceJoin(key);
      const args = this.#owner.#pendingArgsByKey.get(key);
      if (args === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoCoalesced', () => {
        const hookResult = this.#owner.onMemoCoalesced(key, args);
        return hookResult;
      });
    }
  };

  /**
   * Creates a new Memoize wrapping `fn`.
   *
   * @param fn - Function to memoize; may return a value or a Promise
   * @param options - `{ keyFn, capacity, ttlMs?, staleMs? }` — `keyFn` is required
   * @returns New Memoize instance
   */
  static create<
    TArgs extends unknown[],
    TResult,
    TInstance extends Memoize<TArgs, TResult> = Memoize<TArgs, TResult>
  >(
    this: MemoizeSubclassInterface<TInstance>,
    fn: (...args: TArgs) => TResult | Promise<TResult>,
    options: MemoizeOptionsInterface<TArgs>
  ): TInstance {
    const cache = LruCache.create<string, TResult>({
      'capacity': options.capacity,
      ...(options.staleMs !== undefined ? { 'staleMs': options.staleMs } : {}),
      ...(options.ttlMs !== undefined ? { 'ttlMs': options.ttlMs } : {})
    });

    const deps: MemoizeDepsInterface<TArgs, TResult> = {
      'cache': cache,
      'fn': fn,
      'keyFn': options.keyFn
    };
    const result: unknown = Reflect.construct(this, [deps]);

    if (!MemoizeInstance.belongsTo(this, result)) {
      throw new TypeError('Memoize.create() did not construct the requested subclass.');
    }

    return result;
  }

  readonly #cache: LruCache<string, TResult>;
  readonly #coalesce: Coalesce<TResult>;
  readonly #fn: (...args: TArgs) => TResult | Promise<TResult>;
  readonly #keyFn: (...args: TArgs) => string;
  protected readonly hooks: HookInvoker = new MemoizeHookInvoker();

  /**
   * Per-key arguments for calls currently entering the composed `Coalesce`,
   * readable from its delegated `onCoalesceStart`/`onCoalesceJoin` hooks so
   * `onMemoMiss`/`onMemoCoalesced` can be fired with the caller's own `args`
   * alongside `key`. Keyed by the derived cache key (rather than a single
   * shared field) so concurrent `call()` invocations for distinct keys never
   * cross-contaminate each other's hook args — each entry is set
   * synchronously in `call()` immediately before `Coalesce#run()` is invoked
   * for that key, and `Coalesce#run()` calls its hooks synchronously (before
   * its first `await`), so the entry is always current when its hook reads
   * it. Removed once that `call()`'s `run()` settles.
   */
  readonly #pendingArgsByKey = new Map<string, TArgs>();

  protected constructor(deps: MemoizeDepsInterface<TArgs, TResult>) {
    this.#cache = deps.cache;
    this.#coalesce = new Memoize.#OwnedCoalesce<TArgs, TResult>(this);
    this.#fn = deps.fn;
    this.#keyFn = deps.keyFn;
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

    const cached = this.#cache.tryGet(key);
    if (MemoizeCacheLookup.isHit(cached)) {
      const value = cached.value;
      await this.hooks.invokeAsync('onMemoHit', () => {
        const hookResult = this.onMemoHit(key, args);
        return hookResult;
      });
      return value;
    }

    this.#pendingArgsByKey.set(key, args);

    try {
      const result = await this.#coalesce.run(key, () => {
        const value = this.#fn(...args);
        return Promise.resolve(value);
      });

      this.#cache.set(key, result);

      return result;
    } finally {
      this.#pendingArgsByKey.delete(key);
    }
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

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Observe memoization semantics
  // (hit/miss/coalesced) without coupling this class to any logging/metrics
  // library. Hook failures are swallowed by the composed invoker so they
  // cannot corrupt `call()`'s cache or coalesce bookkeeping.
  // ---------------------------------------------------------------------------

  /** Fires when `call()` returns a cached result for `key` without re-invoking the wrapped function. */
  protected onMemoHit(_key: string, _args: TArgs): void {}

  /** Fires when `key` is genuinely new (or its entry expired) and the wrapped function is about to run. */
  protected onMemoMiss(_key: string, _args: TArgs): void {}

  /** Fires when a caller joins an in-flight invocation for `key` already running. */
  protected onMemoCoalesced(_key: string, _args: TArgs): void {}
}
