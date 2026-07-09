/**
 * Idempotency key guard composing cache, concurrency, and json
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';
import { Hash } from '@studnicky/json';

import type { IdempotencyGuardEntryType } from './types/IdempotencyGuardEntryType.js';
import type { IdempotencyGuardOptionsType } from './types/IdempotencyGuardOptionsType.js';

import { IdempotencyConflictError } from './errors/index.js';
import { IdempotencyGuardBuilder } from './IdempotencyGuardBuilder.js';

/**
 * Composes `@studnicky/cache` (`LruCache`), `@studnicky/concurrency`
 * (`Coalesce`), and `@studnicky/json` (`Hash`) into the "check cache → check
 * in-flight → run → store" idempotency-key pattern.
 *
 * `run(key, payload, factory)` fingerprints `payload` via `Hash.value()` and
 * checks the composed `LruCache` for an existing entry under `key`:
 * - Entry present, fingerprint matches → the cached result is replayed
 *   without re-running `factory` (`onReplay`).
 * - Entry present, fingerprint differs → `onConflict` fires and
 *   `IdempotencyConflictError` is thrown WITHOUT running `factory` — the key
 *   was reused for a different request.
 * - No entry (key unseen, or seen but expired out of the cache) → the call
 *   runs through the composed `Coalesce` so concurrent callers sharing the
 *   same key share one execution: the leader fires `onExecute` before
 *   `factory` runs, followers fire `onCoalesce` when they join the in-flight
 *   call. The result is cached alongside its fingerprint on success.
 *
 * Composes `Coalesce` rather than extending it, and delegates the internal
 * instance's `onCoalesceStart`/`onCoalesceJoin` hooks to `IdempotencyGuard`'s
 * own `onExecute`/`onCoalesce` hooks so subclasses can observe idempotency
 * semantics without reaching into the internal instance — the same
 * delegation technique `@studnicky/paginator`'s `Paginator` uses for its
 * internal `StateMachine`.
 *
 * @example Direct composition
 * ```typescript
 * const guard = IdempotencyGuard.create({ capacity: 1000, ttlMs: 60_000 });
 *
 * const result = await guard.run('order-123', { amount: 500 }, async () => {
 *   return chargeCard(500);
 * });
 * ```
 */
export class IdempotencyGuard {
  /**
   * Creates a new IdempotencyGuard.
   *
   * @param options - `{ capacity, ttlMs }` for the composed `LruCache`
   * @returns New IdempotencyGuard instance
   */
  static create(options: IdempotencyGuardOptionsType): IdempotencyGuard {
    return new this(options);
  }

  static builder(): IdempotencyGuardBuilder {
    const result = IdempotencyGuardBuilder.create((options) => {
      const guard = IdempotencyGuard.create(options);
      return guard;
    });
    return result;
  }

  readonly #cache: LruCache<string, IdempotencyGuardEntryType>;
  readonly #coalesce: Coalesce<unknown>;

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  protected constructor(options: IdempotencyGuardOptionsType) {
    this.#cache = LruCache.create<string, IdempotencyGuardEntryType>({
      'capacity': options.capacity,
      'ttlMs': options.ttlMs
    });

    this.#coalesce = new (class extends Coalesce<unknown> {
      constructor(private guard: IdempotencyGuard) {
        super();
      }

      protected override onCoalesceStart(key: string): void {
        super.onCoalesceStart(key);
        try {
          this.guard.onExecute(key);
        } catch {}
      }

      protected override onCoalesceJoin(key: string): void {
        super.onCoalesceJoin(key);
        try {
          this.guard.onCoalesce(key);
        } catch {}
      }
    })(this);
  }

  /**
   * Runs `factory` under idempotency-key protection.
   *
   * @param key - Caller-supplied idempotency key
   * @param payload - Request payload; fingerprinted via `Hash.value()` to
   *   detect key reuse with a different payload
   * @param factory - Produces the result for a genuinely new (or expired) key
   * @returns The result — either freshly produced or replayed from cache
   * @throws {IdempotencyConflictError} `key` has a cached entry whose
   *   fingerprint does not match `payload`'s fingerprint
   */
  async run<TResult>(key: string, payload: unknown, factory: () => Promise<TResult>): Promise<TResult> {
    const fingerprint = Hash.value(payload);
    const cached = this.#cache.get(key);

    if (cached !== undefined) {
      if (cached.fingerprint === fingerprint) {
        this.#invokeHook(() => {
          this.onReplay(key);
        });
        return cached.result as TResult;
      }

      this.#invokeHook(() => {
        this.onConflict(key);
      });
      throw new IdempotencyConflictError(key);
    }

    const result = await this.#coalesce.run(key, async () => {
      const value = await factory();
      return value;
    });

    this.#cache.set(key, { 'fingerprint': fingerprint, 'result': result });

    return result as TResult;
  }

  /** The composed `LruCache` instance — never a copy or wrapper. */
  getCache(): LruCache<string, IdempotencyGuardEntryType> {
    return this.#cache;
  }

  /** The composed `Coalesce` instance — never a copy or wrapper. */
  getCoalesce(): Coalesce<unknown> {
    return this.#coalesce;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Observe idempotency semantics
  // (replay/conflict/execute/coalesce) without coupling this class to any
  // logging/metrics library. Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires when `run()` replays a cached result for a matching-fingerprint key. */
  protected onReplay(_key: string): void {}

  /** Fires when a caller joins an in-flight execution for `key` already running. */
  protected onCoalesce(_key: string): void {}

  /** Fires when `run()` is about to throw `IdempotencyConflictError` for `key`. */
  protected onConflict(_key: string): void {}

  /** Fires when `key` is genuinely new (or expired) and `factory` is about to run. */
  protected onExecute(_key: string): void {}
}
