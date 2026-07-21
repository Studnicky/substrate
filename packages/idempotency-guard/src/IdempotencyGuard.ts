/**
 * Idempotency key guard composing cache, concurrency, and json
 */

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';
import { HookInvoker } from '@studnicky/errors';
import { Hash } from '@studnicky/json';

import type { IdempotencyGuardOptionsEntity } from './entities/IdempotencyGuardOptionsEntity.js';
import type { IdempotencyGuardEntryInterface } from './interfaces/IdempotencyGuardEntryInterface.js';

import { IdempotencyConflictError } from './errors/index.js';

class IdempotencyGuardHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
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
 * Composes `Coalesce` rather than extending it. A class-private owned
 * `Coalesce` subclass holds a readonly reference to its `IdempotencyGuard`
 * and dispatches `onCoalesceStart`/`onCoalesceJoin` directly to the owning
 * guard's `onExecute`/`onCoalesce` hooks.
 *
 * @example Direct composition
 * ```typescript
 * const guard = IdempotencyGuard.create<ChargeResult>({ capacity: 1000, ttlMs: 60_000 });
 *
 * const result = await guard.run('order-123', { amount: 500 }, async () => {
 *   return chargeCard(500);
 * });
 * ```
 *
 * @typeParam TResult - The result contract shared by every key owned by this guard
 */
export class IdempotencyGuard<TResult = unknown> {
  static readonly #OwnedCoalesce = class IdempotencyGuardCoalesce<TOwnerResult>
    extends Coalesce<IdempotencyGuardEntryInterface<TOwnerResult>> {
    readonly #owner: IdempotencyGuard<TOwnerResult>;

    constructor(owner: IdempotencyGuard<TOwnerResult>) {
      super();
      this.#owner = owner;
    }

    protected override onCoalesceStart(key: string): void {
      super.onCoalesceStart(key);
      this.#owner.hooks.invoke('onExecute', () => {
        const hookResult = this.#owner.onExecute(key);
        return hookResult;
      });
    }

    protected override onCoalesceJoin(key: string): void {
      super.onCoalesceJoin(key);
      this.#owner.hooks.invoke('onCoalesce', () => {
        const hookResult = this.#owner.onCoalesce(key);
        return hookResult;
      });
    }
  };

  /**
   * Creates a new IdempotencyGuard.
   *
   * @param options - `{ capacity, ttlMs }` for the composed `LruCache`
   * @returns New IdempotencyGuard instance
   */
  static create<TResult = unknown>(
    options: IdempotencyGuardOptionsEntity.Type
  ): IdempotencyGuard<TResult> {
    return new this<TResult>(options);
  }

  readonly #cache: LruCache<string, IdempotencyGuardEntryInterface<TResult>>;
  readonly #coalesce: Coalesce<IdempotencyGuardEntryInterface<TResult>>;
  readonly #inFlightFingerprints = new Map<string, string>();
  protected readonly hooks: HookInvoker = new IdempotencyGuardHookInvoker();

  protected constructor(options: IdempotencyGuardOptionsEntity.Type) {
    this.#cache = LruCache.create<string, IdempotencyGuardEntryInterface<TResult>>({
      'capacity': options.capacity,
      'ttlMs': options.ttlMs
    });

    this.#coalesce = new IdempotencyGuard.#OwnedCoalesce<TResult>(this);
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
  async run(
    key: string,
    payload: unknown,
    factory: () => TResult | Promise<TResult>
  ): Promise<TResult> {
    const fingerprint = Hash.value(payload);
    const cached = this.#cache.get(key);

    if (cached !== undefined) {
      if (cached.fingerprint === fingerprint) {
        await this.hooks.invokeAsync('onReplay', () => {
          const hookResult = this.onReplay(key);
          return hookResult;
        });
        return cached.result;
      }

      await this.hooks.invokeAsync('onConflict', () => {
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
      await this.hooks.invokeAsync('onConflict', () => {
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
      const executeFactory = async (): Promise<IdempotencyGuardEntryInterface<TResult>> => {
        const produced = factory();
        const result = await Promise.resolve(produced);
        return { 'fingerprint': fingerprint, 'result': result };
      };
      const entry = await this.#coalesce.run(key, executeFactory);
      if (entry.fingerprint !== fingerprint) {
        throw new TypeError('Idempotency guard result entry does not match its payload fingerprint.');
      }
      this.#cache.set(key, entry);

      return entry.result;
    } finally {
      if (isLeader) {
        this.#inFlightFingerprints.delete(key);
      }
    }
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
