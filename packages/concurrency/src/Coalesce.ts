/** Keyed async coalescing: concurrent calls for the same key share one in-flight promise. */

import { HookInvoker } from '@studnicky/errors';

import type { CoalesceOptionsEntity } from './entities/CoalesceOptionsEntity.js';

import { CoalesceBuilder } from './CoalesceBuilder.js';
import { CoalesceTimeoutError } from './errors/CoalesceTimeoutError.js';

export class Coalesce<T> {
  static builder<T>(): CoalesceBuilder<T> {
    const result = CoalesceBuilder.create<T>((options) => {
      const coalesce = Coalesce.create<T>(options);
      return coalesce;
    });
    return result;
  }

  static create<T>(options?: CoalesceOptionsEntity.Type): Coalesce<T> {
    const result = new (this as unknown as new (options?: CoalesceOptionsEntity.Type) => Coalesce<T>)(options);
    return result;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  readonly #inFlight = new Map<string, Promise<T>>();
  readonly #timeout: number | undefined;

  protected constructor(options?: CoalesceOptionsEntity.Type) {
    this.#timeout = options?.timeout;
  }

  async run(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.#inFlight.get(key);
    if (existing !== undefined) {
      await Promise.resolve(this.hooks.invoke('onCoalesceJoin', () => { const result = this.onCoalesceJoin(key); return result; }));
      return await this.#awaitWithTimeout(key, existing);
    }

    let success = false;
    const started = factory()
      .then((v) => { success = true; return v; })
      .catch((e: unknown) => { success = false; throw e; })
      .finally(async () => {
        this.#inFlight.delete(key);
        await Promise.resolve(this.hooks.invoke('onCoalesceSettled', () => { const result = this.onCoalesceSettled(key, success); return result; }));
      });
    this.#inFlight.set(key, started);
    await Promise.resolve(this.hooks.invoke('onCoalesceStart', () => { const result = this.onCoalesceStart(key); return result; }));
    return await this.#awaitWithTimeout(key, started);
  }

  /**
   * Races this caller's wait on the shared in-flight promise against its own
   * timer. Only this caller is affected when the timer wins — the in-flight
   * map entry is left untouched, so the underlying factory (and every other
   * caller waiting on it) proceeds unaffected.
   */
  #awaitWithTimeout(key: string, inFlight: Promise<T>): Promise<T> {
    if (this.#timeout === undefined) {
      return inFlight;
    }
    const timeoutMs = this.#timeout;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) { return; }
        settled = true;
        // The onTimeout hook is invoked in a non-async setTimeout callback, so
        // it cannot be awaited directly. `hooks.invoke` no longer always returns
        // a Promise (it returns `T` directly for a genuinely-synchronous
        // hook), so a synchronous failure would otherwise throw straight out
        // of this callback instead of rejecting this promise — routing the
        // call through a resolved-promise `.then` first ensures both a sync
        // throw and an async-override rejection land in the same handler.
        // Its own error (if any) is used to reject this caller's promise
        // instead of CoalesceTimeoutError, scoping the hook failure to this
        // single caller — the shared in-flight entry and every other waiter
        // are unaffected either way.
        const runOnTimeoutHook = (): void => { this.hooks.invoke('onTimeout', () => { const result = this.onTimeout(key, timeoutMs); return result; }); };
        void Promise.resolve()
          .then(runOnTimeoutHook)
          .then(
            () => { reject(new CoalesceTimeoutError(key, timeoutMs)); },
            (hookError: unknown) => { reject(hookError); }
          );
      }, timeoutMs);
      inFlight.then(
        (value) => {
          if (settled) { return; }
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          if (settled) { return; }
          settled = true;
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      );
    });
  }

  isInflight(key: string): boolean {
    const result = this.#inFlight.has(key);
    return result;
  }

  /**
   * Fires when this is the leader caller — factory is about to be invoked.
   * Overrides must not throw or block.
   */
  protected onCoalesceStart(_key: string): void {}

  /**
   * Fires when this caller joined an in-flight call.
   * Overrides must not throw or block.
   */
  protected onCoalesceJoin(_key: string): void {}

  /**
   * Fires when the in-flight promise settles.
   * `success` is true on resolve, false on reject.
   * Overrides must not throw or block.
   */
  protected onCoalesceSettled(_key: string, _success: boolean): void {}

  /**
   * Fires for a single caller when its configured `timeout` elapses before
   * the shared in-flight promise for `key` settles. Only that caller's
   * `run()` rejects with `CoalesceTimeoutError`; the in-flight entry and any
   * other waiting callers are unaffected. Never fires when timeout is left
   * unconfigured.
   * Overrides must not throw or block.
   */
  protected onTimeout(_key: string, _timeoutMs: number): void {}
}
