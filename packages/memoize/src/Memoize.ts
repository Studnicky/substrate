/**
 * Pure function memoization composing cache and concurrency
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';
import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { CacheLookupEntity } from './entities/CacheLookupEntity.js';
import type { MemoizeOptionsInterface } from './interfaces/MemoizeOptionsInterface.js';

class MemoizeHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string): void {}
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
    const result = Object.hasOwn(lookup, 'value');
    return result;
  }
}

interface MemoizeDepsInterface<TArgumentList extends unknown[], TResult> {
  'cache': LruCache<string, TResult>;
  'callback': (...argumentList: TArgumentList) => TResult | Promise<TResult>;
  'keyDeriver': (...argumentList: TArgumentList) => string;
}

interface MemoizeSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class MemoizeInstance {
  static belongsTo<TInstance extends object>(
    constructor: MemoizeSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

// TArgumentList/TResult only appear in Memoize's covariant/contravariant members
// (call()'s args/return, invalidate()'s args), so a bound of
// `Memoize<TArgumentList, TResult>` would force `Memoize<TArgumentList, TResult>` (the
// method's own general TArgumentList/TResult) to satisfy `Memoize<never, never>`/
// `Memoize<any, any>`, which either fails to typecheck or requires a banned
// `any` — and TArgumentList sits in `callback`'s parameter position (contravariant), which
// collapses `this`-context inference the moment a caller passes an untyped
// arrow function. `clear()` is the one public member that doesn't mention
// TArgumentList/TResult at all, so it constrains TInstance to "is actually
// Memoize-shaped" without hitting that wall.
interface MemoizeShapeInterface {
  clear(): void;
}

/**
 * Composes `@studnicky/cache` (`LruCache`) and `@studnicky/concurrency`
 * (`Coalesce`) into pure function memoization keyed by a caller-supplied key
 * derivation function.
 *
 * `call(...args)` derives `key = keyDeriver(...args)` and checks the composed
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
 * `keyDeriver` is a required config field, mirroring `LruCache`'s explicit-key
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
 *   { keyDeriver: (userId) => userId, capacity: 1000, ttlMs: 60_000 }
 * );
 *
 * const user = await memo.call('user-42');
 * ```
 */
export class Memoize<TArgumentList extends unknown[], TResult> {
  static readonly #OwnedCoalesce = class MemoizeCoalesce<
    TOwnerArgumentList extends unknown[],
    TOwnerResult
  > extends Coalesce<TOwnerResult> {
    readonly #owner: Memoize<TOwnerArgumentList, TOwnerResult>;

    constructor(owner: Memoize<TOwnerArgumentList, TOwnerResult>) {
      super();
      this.#owner = owner;
    }

    protected override onCoalesceStart(key: string): void {
      super.onCoalesceStart(key);
      const argumentList = this.#owner.#pendingArgumentListByKey.get(key);
      if (argumentList === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoMiss', () => {
        const hookResult = this.#owner.onMemoMiss(key, argumentList);
        return hookResult;
      });
    }

    protected override onCoalesceJoin(key: string): void {
      super.onCoalesceJoin(key);
      const argumentList = this.#owner.#pendingArgumentListByKey.get(key);
      if (argumentList === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoCoalesced', () => {
        const hookResult = this.#owner.onMemoCoalesced(key, argumentList);
        return hookResult;
      });
    }
  };

  /**
   * Creates a new Memoize wrapping a callback.
   *
   * @param callback - Function to memoize; may return a value or a Promise
   * @param options - `{ keyDeriver, capacity, ttlMs?, staleMs? }` — `keyDeriver` is required
   * @returns New Memoize instance
   */
  static create<
    TArgumentList extends unknown[],
    TResult,
    TInstance extends MemoizeShapeInterface = Memoize<TArgumentList, TResult>
  >(
    this: MemoizeSubclassInterface<TInstance>,
    callback: (...argumentList: TArgumentList) => TResult | Promise<TResult>,
    options: MemoizeOptionsInterface<TArgumentList>
  ): TInstance {
    const cache = LruCache.create<string, TResult>({
      'capacity': options.capacity,
      ...(options.staleMs !== undefined ? { 'staleMs': options.staleMs } : {}),
      ...(options.ttlMs !== undefined ? { 'ttlMs': options.ttlMs } : {})
    });

    const deps: MemoizeDepsInterface<TArgumentList, TResult> = {
      'cache': cache,
      'callback': callback,
      'keyDeriver': options.keyDeriver
    };
    const result: unknown = Reflect.construct(this, [deps]);

    if (!Predicates.isObjectLike(result) || !MemoizeInstance.belongsTo(this, result)) {
      throw RuntimeError.create('Memoize.create() did not construct the requested subclass.');
    }

    return result;
  }

  readonly #cache: LruCache<string, TResult>;
  readonly #coalesce: Coalesce<TResult>;
  readonly #callback: (...argumentList: TArgumentList) => TResult | Promise<TResult>;
  readonly #keyDeriver: (...argumentList: TArgumentList) => string;
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
  readonly #pendingArgumentListByKey = new Map<string, TArgumentList>();

  protected constructor(dependencies: MemoizeDepsInterface<TArgumentList, TResult>) {
    this.#cache = dependencies.cache;
    this.#coalesce = new Memoize.#OwnedCoalesce<TArgumentList, TResult>(this);
    this.#callback = dependencies.callback;
    this.#keyDeriver = dependencies.keyDeriver;
  }

  /**
   * Returns the memoized result for `args`, invoking the wrapped function at
   * most once per distinct derived key until the cache entry expires or is
   * invalidated.
   *
   * @param args - Arguments forwarded to the wrapped function and to `keyDeriver`
   * @returns The wrapped function's result — either freshly produced or replayed from cache
   */
  async call(...argumentList: TArgumentList): Promise<TResult> {
    const key = this.#keyDeriver(...argumentList);

    const cached = this.#cache.tryGet(key);
    if (MemoizeCacheLookup.isHit(cached)) {
      const value = cached.value;
      await this.hooks.invokeAsync('onMemoHit', () => {
        const hookResult = this.onMemoHit(key, argumentList);
        return hookResult;
      });
      return value;
    }

    this.#pendingArgumentListByKey.set(key, argumentList);

    try {
      const result = await this.#coalesce.run(key, () => {
        const value = this.#callback(...argumentList);
        const resolvedValue = Promise.resolve(value);
        return resolvedValue;
      });

      this.#cache.set(key, result);

      return result;
    } finally {
      this.#pendingArgumentListByKey.delete(key);
    }
  }

  /** Evicts the cache entry for `keyDeriver(...args)` so the next matching call re-invokes the wrapped function. */
  invalidate(...argumentList: TArgumentList): void {
    const key = this.#keyDeriver(...argumentList);
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
  protected onMemoHit(_key: string, _argumentList: TArgumentList): void {}

  /** Fires when `key` is genuinely new (or its entry expired) and the wrapped function is about to run. */
  protected onMemoMiss(_key: string, _argumentList: TArgumentList): void {}

  /** Fires when a caller joins an in-flight invocation for `key` already running. */
  protected onMemoCoalesced(_key: string, _argumentList: TArgumentList): void {}
}
