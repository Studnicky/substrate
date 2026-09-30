/** Keyed async coalescing: concurrent calls for the same key share one in-flight promise. */

import { SchemaIntakeError } from '@studnicky/entity/browser';
import { HookInvoker } from '@studnicky/errors/browser';
import { RaceTimeout } from '@studnicky/signal/browser';
import { CallerFault } from '@studnicky/types/browser';

import type { CoalesceKeyStateEntity } from './entities/CoalesceKeyStateEntity.js';

import { CoalesceKeyMachine } from './CoalesceKeyMachine.js';
import { CoalesceOptionsEntity } from './entities/CoalesceOptionsEntity.js';
import { CoalesceConfigError } from './errors/CoalesceConfigError.js';
import { CoalesceTimeoutError } from './errors/CoalesceTimeoutError.js';
import { CoalesceWaitCompletedError } from './errors/CoalesceWaitCompletedError.js';

export class Coalesce<T> {
  static create<T>(
    this: typeof Coalesce,
    options?: CoalesceOptionsEntity.InputType
  ): Coalesce<T> {
    let validated: CoalesceOptionsEntity.Type;
    try {
      validated = CoalesceOptionsEntity.intake(options ?? {});
    } catch (error) {
      throw new CoalesceConfigError(error instanceof SchemaIntakeError ? error.message : 'Coalesce options intake failed', error);
    }

    return new this(validated);
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  readonly #inFlight = new Map<string, Promise<T>>();
  readonly #keyMachine = new CoalesceKeyMachine();
  readonly #keyStates = new Map<string, CoalesceKeyStateEntity.Type>();
  readonly #timeout: number | undefined;

  protected constructor(options?: CoalesceOptionsEntity.Type) {
    this.#timeout = options?.timeout;
  }

  async run(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.#inFlight.get(key);
    if (existing !== undefined) {
      await this.hooks.invokeAsync('onCoalesceJoin', () => { const result = this.onCoalesceJoin(key); return result; });
      return await this.#awaitWithTimeout(key, existing);
    }

    const completion = Promise.withResolvers<T>();
    let success = false;
    void completion.promise.then(
      () => { success = true; },
      () => { success = false; }
    );
    const started = completion.promise.finally(async () => {
      this.#inFlight.delete(key);
      const settledState = this.#keyStates.get(key) ?? this.#keyMachine.getInitialState();
      this.#keyStates.set(key, this.#keyMachine.transition(settledState, { 'type': 'settle' }).state);
      this.#keyStates.delete(key);
      await this.hooks.invokeAsync('onCoalesceSettled', () => { const result = this.onCoalesceSettled(key, success); return result; });
    });
    this.#inFlight.set(key, started);
    const startedState = this.#keyStates.get(key) ?? this.#keyMachine.getInitialState();
    this.#keyStates.set(key, this.#keyMachine.transition(startedState, { 'type': 'start' }).state);

    try {
      await this.hooks.invokeAsync('onCoalesceStart', () => { const result = this.onCoalesceStart(key); return result; });
      completion.resolve(factory());
    } catch (error) {
      completion.resolve(CallerFault.rejection(error));
    }

    return await this.#awaitWithTimeout(key, started);
  }

  /**
   * Races this caller's wait on the shared in-flight promise against its own
   * timer. Only this caller is affected when the timer wins — the in-flight
   * map entry is left untouched, so the underlying factory (and every other
   * caller waiting on it) proceeds unaffected.
   */
  async #awaitWithTimeout(key: string, inFlight: Promise<T>): Promise<T> {
    if (this.#timeout === undefined) {
      return await inFlight;
    }
    const timeoutMs = this.#timeout;
    const completionController = new AbortController();
    const timeout = RaceTimeout.wait(timeoutMs, completionController.signal).then(async (outcome) => {
      if (outcome === 'aborted') {
        return await inFlight;
      }

      await this.hooks.invokeAsync('onTimeout', () => {
        const result = this.onTimeout(key, timeoutMs);
        return result;
      });
      throw new CoalesceTimeoutError(key, timeoutMs);
    });

    try {
      return await Promise.race([inFlight, timeout]);
    } finally {
      completionController.abort(new CoalesceWaitCompletedError(key));
    }
  }

  isInflight(key: string): boolean {
    if (this.#inFlight.has(key)) {
      return true;
    }
    return false;
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
   * `run()` is affected; successful hook completion produces a
   * `CoalesceTimeoutError`, while hook failure propagates its invocation error.
   * The in-flight entry and other waiting callers are unaffected. Never fires
   * when timeout is left unconfigured.
   */
  protected onTimeout(_key: string, _timeoutMs: number): void {}
}
