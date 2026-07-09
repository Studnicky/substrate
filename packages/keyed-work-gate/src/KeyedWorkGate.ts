/**
 * Keyed single-flight and serialized work gate composing `@studnicky/mutex` and
 * `@studnicky/concurrency`'s `Coalesce`.
 */

import { Coalesce } from '@studnicky/concurrency';
import { Mutex } from '@studnicky/mutex';

import type { KeyedWorkGateConfigType } from './types/KeyedWorkGateConfigType.js';

import { KeyedWorkGateBuilder } from './KeyedWorkGateBuilder.js';

type KeyedWorkGateDepsType<K extends PropertyKey> = {
  'coalesce': Coalesce<unknown>;
  'mutex': Mutex<K>;
};

/**
 * Composes `@studnicky/mutex`'s `Mutex` and `@studnicky/concurrency`'s `Coalesce` into two
 * keyed work-gating patterns: single-flight (`runSingleFlight`) and strict serialization
 * (`runSerialized`).
 *
 * `KeyedWorkGate` has no lifecycle hooks of its own. Observability is delegated entirely to
 * the composed primitives (subclass `Mutex`/`Coalesce` and pass instances in); the getters
 * expose every composed instance so a `KeyedWorkGate` subclass can still reach them.
 *
 * @example Direct composition
 * ```typescript
 * const gate = KeyedWorkGate.create<string>({
 *   mutex: { enableCoalescing: false, timeout: 5000 }
 * });
 *
 * // Concurrent calls with the same key share one execution
 * const [a, b] = await Promise.all([
 *   gate.runSingleFlight('user1', () => fetchUser('user1')),
 *   gate.runSingleFlight('user1', () => fetchUser('user1'))
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
  static create<K extends PropertyKey = string>(config: KeyedWorkGateConfigType<K> = {}): KeyedWorkGate<K> {
    const result = new this<K>({
      'coalesce': KeyedWorkGate.#resolveCoalesce(config.coalesce),
      'mutex': KeyedWorkGate.#resolveMutex<K>(config.mutex)
    });
    return result;
  }

  static builder<K extends PropertyKey = string>(): KeyedWorkGateBuilder<K> {
    const result = KeyedWorkGateBuilder.create<K>((config) => {
      const gate = KeyedWorkGate.create<K>(config);
      return gate;
    });
    return result;
  }

  static #resolveCoalesce(value: KeyedWorkGateConfigType<PropertyKey>['coalesce']): Coalesce<unknown> {
    if (value instanceof Coalesce) {
      return value;
    }
    const result = Coalesce.create<unknown>(value);
    return result;
  }

  static #resolveMutex<K extends PropertyKey>(value: KeyedWorkGateConfigType<K>['mutex']): Mutex<K> {
    if (value instanceof Mutex) {
      return value;
    }
    const result = Mutex.create<K>(value);
    return result;
  }

  readonly #coalesce: Coalesce<unknown>;
  readonly #mutex: Mutex<K>;

  protected constructor(deps: KeyedWorkGateDepsType<K>) {
    this.#coalesce = deps.coalesce;
    this.#mutex = deps.mutex;
  }

  getCoalesce(): Coalesce<unknown> {
    return this.#coalesce;
  }

  getMutex(): Mutex<K> {
    return this.#mutex;
  }

  /**
   * Runs `fn` once per set of concurrent callers sharing `key`, guarded by the mutex.
   *
   * Composition order is Coalesce-first, falling through to Mutex — not the reverse — because
   * the two primitives solve different problems that only compose correctly in this order:
   *
   * 1. `Coalesce` collapses concurrent callers requesting the identical `key` into a single
   *    execution — every caller in the group observes the same result, and `fn` runs exactly
   *    once for the whole group.
   * 2. The single execution that Coalesce elects to run (the "leader") still acquires the
   *    `Mutex` for `key` before invoking `fn`. This matters when `runSerialized` (which never
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
   * @param fn - The function to execute at most once per concurrent same-key group
   * @returns The shared result for every caller in the coalesced group
   */
  async runSingleFlight<T>(key: K, fn: () => Promise<T>): Promise<T> {
    const coalesceKey = String(key);

    const result = await this.#coalesce.run(coalesceKey, async () => {
      const value = await this.#mutex.runExclusive(key, fn);
      return value;
    });

    // Coalesce<unknown> erases the per-call result type; the factory above always resolves
    // with exactly what `fn` produced, so this narrows back to T.
    return result as T;
  }

  /**
   * Runs `fn` directly through the `Mutex`, with no coalescing. Every call runs, in order,
   * for a given `key` — none are skipped or shared with a concurrent caller.
   *
   * @param key - Mutex lock key
   * @param fn - The function to execute exclusively
   * @returns The result of this specific call to `fn`
   */
  async runSerialized<T>(key: K, fn: () => Promise<T>): Promise<T> {
    const result = await this.#mutex.runExclusive(key, fn);
    return result;
  }
}
