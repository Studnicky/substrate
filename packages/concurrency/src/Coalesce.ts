/** Keyed async coalescing: concurrent calls for the same key share one in-flight promise. */

import { HookInvoker } from '@studnicky/errors';

import type { CoalesceOptionsEntity } from './entities/CoalesceOptionsEntity.js';
import type { CoalesceKeyStateInterface } from './interfaces/CoalesceKeyStateInterface.js';

import { CoalesceKeyMachine } from './CoalesceKeyMachine.js';
import { CoalesceTimeoutError } from './errors/CoalesceTimeoutError.js';

interface CoalesceSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class CoalesceInstance {
  static belongsTo<TInstance>(
    constructor: CoalesceSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

// T only appears in Coalesce's covariant/contravariant members (run()'s factory
// and return value), so a bound of `Coalesce<T>` would force `Coalesce<T>` (the
// method's own general T) to satisfy `Coalesce<never>`/`Coalesce<any>`, which
// either fails to typecheck or requires a banned `any`. `isInflight()` is the one
// public member that doesn't mention T at all, so it constrains TInstance to
// "is actually Coalesce-shaped" without hitting that wall.
interface CoalesceShapeInterface {
  isInflight(key: string): boolean;
}

export class Coalesce<T> {
  static create<
    T,
    TInstance extends CoalesceShapeInterface = Coalesce<T>
  >(
    this: CoalesceSubclassInterface<TInstance>,
    options?: CoalesceOptionsEntity.Type
  ): TInstance {
    const result: unknown = Reflect.construct(this, [options]);
    if (!CoalesceInstance.belongsTo(this, result)) {
      throw new TypeError('Coalesce.create() did not construct the requested subclass.');
    }
    const instance: TInstance = result;
    return instance;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  readonly #inFlight = new Map<string, Promise<T>>();
  readonly #keyMachine = new CoalesceKeyMachine();
  readonly #keyStates = new Map<string, CoalesceKeyStateInterface>();
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
    const started = completion.promise
      .then(
        (value) => { success = true; return value; },
        (error: unknown) => { success = false; throw error; }
      )
      .finally(async () => {
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
      completion.reject(error);
    }

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
        this.hooks.invokeAsync('onTimeout', () => {
          const result = this.onTimeout(key, timeoutMs);
          return result;
        }).then(
          () => { reject(new CoalesceTimeoutError(key, timeoutMs)); },
          reject
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
