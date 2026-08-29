import { Coalesce } from '@studnicky/concurrency';
/**
 * Keyed single-flight and serialized work gate composing `@studnicky/mutex` and
 * `@studnicky/concurrency`'s `Coalesce`.
 */
import { RuntimeError } from '@studnicky/errors';
import { Mutex } from '@studnicky/mutex';
import { Predicates } from '@studnicky/types';

import type { KeyedWorkGateConfigInterface } from './interfaces/KeyedWorkGateConfigInterface.js';


interface KeyedWorkGateDepsInterface<K extends PropertyKey> {
  'coalesce': Coalesce<unknown>;
  'mutex': Mutex<K>;
}

interface KeyedWorkGateConstructorInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

interface ResultEntityInterface<T> {
  readonly 'intake': (input: unknown) => T;
}

/**
 * Composes `@studnicky/mutex`'s `Mutex` and `@studnicky/concurrency`'s `Coalesce` into two
 * keyed work-gating patterns: single-flight (`runSingleFlight`) and strict serialization
 * (`runSerialized`).
 *
 * `KeyedWorkGate` has no lifecycle hooks of its own. Observability is delegated entirely to
 * caller-supplied `Mutex` and `Coalesce` instances, which callers retain and inspect directly.
 *
 * @example Direct composition
 * ```typescript
 * const gate = KeyedWorkGate.create<string>({
 *   mutex: { enableCoalescing: false, timeout: 5000 }
 * });
 * const user = await UserEntity.intake(await fetchUser('user1'));
 *
 * // Concurrent calls with the same key share one execution
 * const [a, b] = await Promise.all([
 *   gate.runSingleFlight('user1', UserEntity, () => Promise.resolve(user)),
 *   gate.runSingleFlight('user1', UserEntity, () => Promise.resolve(user))
 * ]);
 * ```
 *
 * @typeParam K - The type of keys used for both the coalesce join-key (stringified) and the
 *   mutex lock key (defaults to string)
 */
export class KeyedWorkGate<K extends PropertyKey = string> {
  /**
   * Creates a new KeyedWorkGate, defaulting any omitted primitive.
   *
   * @param config - Composition configuration
   * @returns New KeyedWorkGate instance
   */
  private static isConstructed<TInstance extends object>(
    value: object,
    constructor: KeyedWorkGateConstructorInterface<TInstance>
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }

  static create<
    K extends PropertyKey = string,
    TInstance extends KeyedWorkGate<K> = KeyedWorkGate<K>
  >(
    this: KeyedWorkGateConstructorInterface<TInstance>,
    config: KeyedWorkGateConfigInterface<K> = {}
  ): TInstance {
    const result: unknown = Reflect.construct(this, [{
      'coalesce': KeyedWorkGate.#resolveCoalesce(config.coalesce),
      'mutex': KeyedWorkGate.#resolveMutex<K>(config.mutex)
    }]);
    if (!Predicates.isObjectLike(result)) {
      throw RuntimeError.create('KeyedWorkGate.create() must construct a KeyedWorkGate instance');
    }
    if (!KeyedWorkGate.isConstructed<TInstance>(result, this)) {
      throw RuntimeError.create('KeyedWorkGate.create() must construct a KeyedWorkGate instance');
    }
    return result;
  }

  static #resolveCoalesce(
    value: KeyedWorkGateConfigInterface<PropertyKey>['coalesce']
  ): Coalesce<unknown> {
    if (value instanceof Coalesce) {
      return value;
    }
    const result = Coalesce.create<unknown>(value);
    return result;
  }

  static #resolveMutex<K extends PropertyKey>(value: KeyedWorkGateConfigInterface<K>['mutex']): Mutex<K> {
    if (value instanceof Mutex) {
      return value;
    }
    const result = Mutex.create<K>(value);
    return result;
  }

  readonly #coalesce: Coalesce<unknown>;
  readonly #mutex: Mutex<K>;

  protected constructor(deps: KeyedWorkGateDepsInterface<K>) {
    this.#coalesce = deps.coalesce;
    this.#mutex = deps.mutex;
  }

  /**
   * Runs `callback` once per set of concurrent callers sharing `key`, guarded by the mutex.
   *
   * Composition order is Coalesce-first, falling through to Mutex — not the reverse — because
   * the two primitives solve different problems that only compose correctly in this order:
   *
   * 1. `Coalesce` collapses concurrent callers requesting the identical `key` into a single
   *    execution — every caller in the group observes the same result, and `callback` runs exactly
   *    once for the whole group.
   * 2. The single execution that Coalesce elects to run (the "leader") still acquires the
   *    `Mutex` for `key` before invoking `callback`. This matters when `runSerialized` (which never
   *    coalesces) is also being called against the same `key` from a different call path: the
   *    mutex is what keeps the coalesced leader's execution mutually exclusive against that
   *    other, non-coalesced work. Without the mutex fall-through, a coalesced "leader" could run
   *    concurrently with a `runSerialized` call on the same key — coalescing only dedupes
   *    same-key callers *within* `runSingleFlight`, it does nothing to protect the key against
   *    other call paths.
   *
   * Reversing the order (mutex-first, then coalesce) would defeat single-flight collapsing: every
   * caller would separately queue for the lock before coalescing ever got a chance to join them,
   * so coalescing would only ever see one queued caller at a time and would never actually collapse
   * concurrent duplicates.
   *
   * @param key - Coalesce join-key and mutex lock key (coalesce keys are string; `key` is
   *   stringified via `String(key)`)
   * @param resultEntity - Entity that parses the shared result for this caller
   * @param callback - The function to execute at most once per concurrent same-key group
   * @returns The shared result for every caller in the coalesced group
   */
  async runSingleFlight<T>(
    key: K,
    resultEntity: ResultEntityInterface<T>,
    callback: () => Promise<T>
  ): Promise<T> {
    const coalesceKey = String(key);

    const result = await this.#coalesce.run(coalesceKey, async () => {
      const value = await this.runSerialized(key, callback);
      return value;
    });

    const parsedResult = resultEntity.intake(result);
    return parsedResult;
  }

  /**
   * Runs `callback` directly through the `Mutex`, with no coalescing. Every call runs, in order,
   * for a given `key` — none are skipped or shared with a concurrent caller.
   *
   * @param key - Mutex lock key
   * @param callback - The function to execute exclusively
   * @returns The result of this specific call to `callback`
   */
  async runSerialized<T>(
    key: K,
    callback: () => Promise<T>
  ): Promise<T> {
    const release = await this.#mutex.acquire(key);
    try {
      return await callback();
    } finally {
      release();
    }
  }
}
