/**
 * Idempotency key guard composing cache, concurrency, and json
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';
import { HookInvoker } from '@studnicky/errors';
import { Hash } from '@studnicky/json';

import type { IdempotencyGuardOptionsEntity } from './entities/IdempotencyGuardOptionsEntity.js';
import type { IdempotencyGuardEntryType } from './types/IdempotencyGuardEntryType.js';

import { IdempotencyConflictError } from './errors/index.js';
import { IdempotencyGuardBuilder } from './IdempotencyGuardBuilder.js';

class IdempotencyGuardCoalesce extends Coalesce<unknown> {
  constructor(
    private readonly onStart: (key: string) => void | Promise<void>,
    private readonly onJoin: (key: string) => void | Promise<void>
  ) {
    super();
  }

  protected override onCoalesceStart(key: string): void {
    super.onCoalesceStart(key);
    void this.onStart(key);
  }

  protected override onCoalesceJoin(key: string): void {
    super.onCoalesceJoin(key);
    void this.onJoin(key);
  }
}

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
 *   same key AND fingerprint share one execution: the leader fires
 *   `onExecute` before `factory` runs, followers fire `onCoalesce` when they
 *   join the in-flight call. The result is cached alongside its fingerprint
 *   on success. A concurrent caller sharing the key but with a DIFFERENT
 *   fingerprint is rejected with `onConflict`/`IdempotencyConflictError`
 *   instead of being merged onto the leader's execution — the leader's
 *   fingerprint is tracked for the lifetime of its in-flight run.
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
  static create(options: IdempotencyGuardOptionsEntity.Type): IdempotencyGuard {
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
  readonly #inFlightFingerprints = new Map<string, string>();
  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Runs `hookName` through the composed `HookInvoker#invoke` — which
   * `await`s `fn`, so it catches both a synchronous throw and a rejected
   * `Promise` from an `async` override — and discards a failure rather than
   * letting `invoke`'s default `onHookError` rethrow it as a
   * `HookInvocationError`: a broken hook must never throw out of or block
   * `run()`.
   */
  async #invokeHookSafely(hookName: string, fn: () => unknown): Promise<void> {
    try {
      await this.hooks.invoke(hookName, fn);
    } catch {
      // Discarded — see method doc: hooks must never break `run()`.
    }
  }

  protected constructor(options: IdempotencyGuardOptionsEntity.Type) {
    this.#cache = LruCache.create<string, IdempotencyGuardEntryType>({
      'capacity': options.capacity,
      'ttlMs': options.ttlMs
    });

    this.#coalesce = new IdempotencyGuardCoalesce(
      (key: string): Promise<void> => {
        const pending = this.#invokeHookSafely('onExecute', () => {
          const hookResult = this.onExecute(key);
          return hookResult;
        });
        return pending;
      },
      (key: string): Promise<void> => {
        const pending = this.#invokeHookSafely('onCoalesce', () => {
          const hookResult = this.onCoalesce(key);
          return hookResult;
        });
        return pending;
      }
    );
  }

  /**
   * Runs `factory` under idempotency-key protection.
   *
   * @param key - Caller-supplied idempotency key
   * @param payload - Request payload; fingerprinted via `Hash.value()` to
   *   detect key reuse with a different payload
   * @param factory - Produces the result for a genuinely new (or expired) key
   * @returns The result — either freshly produced or replayed from cache
   * @throws {IdempotencyConflictError} `key` has a cached entry, or a
   *   currently in-flight execution, whose fingerprint does not match
   *   `payload`'s fingerprint
   */
  async run<TResult>(key: string, payload: unknown, factory: () => Promise<TResult>): Promise<TResult> {
    const fingerprint = Hash.value(payload);
    const cached = this.#cache.get(key);

    if (cached !== undefined) {
      if (cached.fingerprint === fingerprint) {
        await this.#invokeHookSafely('onReplay', () => {
          const hookResult = this.onReplay(key);
          return hookResult;
        });
        return cached.result as TResult;
      }

      await this.#invokeHookSafely('onConflict', () => {
        const hookResult = this.onConflict(key);
        return hookResult;
      });
      throw new IdempotencyConflictError(key);
    }

    // A key with no cached entry yet may still have a leader execution
    // in flight (two concurrent first-time callers racing on the same
    // key). Track the leader's fingerprint separately from the cache so a
    // follower with a mismatched fingerprint is rejected instead of being
    // merged onto the leader's `Coalesce` execution — `Coalesce` itself
    // keys purely by `key`, so it cannot distinguish fingerprints on its
    // own.
    const leaderFingerprint = this.#inFlightFingerprints.get(key);
    if (leaderFingerprint !== undefined && leaderFingerprint !== fingerprint) {
      await this.#invokeHookSafely('onConflict', () => {
        const hookResult = this.onConflict(key);
        return hookResult;
      });
      throw new IdempotencyConflictError(key);
    }

    const isLeader = leaderFingerprint === undefined;
    if (isLeader) {
      this.#inFlightFingerprints.set(key, fingerprint);
    }

    try {
      const result = await this.#coalesce.run(key, factory);

      this.#cache.set(key, { 'fingerprint': fingerprint, 'result': result });

      return result as TResult;
    } finally {
      if (isLeader) {
        this.#inFlightFingerprints.delete(key);
      }
    }
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
