/**
 * Boundary Kit — composes throttle, circuit breaker, and retry into a fixed-order boundary call pattern
 */

import { CircuitBreaker } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import { Throttle } from '@studnicky/throttle';

import type { BoundaryKitConfigType } from './types/BoundaryKitConfigType.js';

import { BoundaryKitBuilder } from './BoundaryKitBuilder.js';
import { BoundaryKitAbortedError } from './errors/BoundaryKitAbortedError.js';

/**
 * Default `CircuitBreaker` options `BoundaryKit` resolves against when `circuitBreaker`
 * is omitted from config. `CircuitBreakerOptionsInterface` requires `failureThreshold`
 * and `resetTimeoutMs`, so — unlike `Throttle`/`Retry`, which both default cleanly from
 * `create()` with no arguments — the bare primitive has no usable zero-arg default. Five
 * consecutive failures before tripping, and a 30 second cool-down before probing again,
 * is a reasonable general-purpose boundary default; a consumer with a stricter SLA
 * supplies its own `circuitBreaker` config or instance.
 */
const DEFAULT_CIRCUIT_BREAKER_OPTIONS = {
  'failureThreshold': 5,
  'resetTimeoutMs': 30_000
} as const;

// json-schema-uninexpressible: fields are live class instances (CircuitBreaker, Retry, Throttle) carrying behavior/methods, not plain JSON-serializable data
type BoundaryKitDepsType = {
  'circuitBreaker': CircuitBreaker;
  'retry': Retry;
  'throttle': Throttle;
};

/**
 * Composes `@studnicky/throttle`, `@studnicky/resilience`'s `CircuitBreaker`, and
 * `@studnicky/retry` into the fixed composition order `throttle → circuitBreaker → retry → fn`.
 *
 * That order is the kit's entire value-add:
 *
 * - `throttle` runs outermost so it bounds concurrency FIRST — the circuit breaker and
 *   retry never observe more concurrent load than the throttle admits. Getting this
 *   order backwards lets retry attempts (and circuit-breaker probes) pile up beyond the
 *   intended concurrency cap.
 * - `circuitBreaker` wraps `retry` so a tripped circuit fails fast BEFORE any retry
 *   attempt runs. If the order were reversed (retry wrapping circuit breaker), every
 *   retry attempt would re-enter and re-trip the breaker individually, wasting attempts
 *   against a dependency already known to be broken.
 * - `retry` is innermost so it operates directly against the real call — it is the last
 *   layer between the composition and `fn` itself.
 *
 * `BoundaryKit` has no lifecycle hooks of its own. Observability is delegated entirely to
 * the composed primitives (subclass `Throttle`/`CircuitBreaker`/`Retry` and pass instances
 * in); the getters expose every composed instance so a `BoundaryKit` subclass can still
 * reach them.
 *
 * @example Direct composition
 * ```typescript
 * const kit = BoundaryKit.create({
 *   throttle: { concurrencyLimit: 10 },
 *   circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
 *   retry: { maxRetries: 3 }
 * });
 *
 * const response = await kit.execute(() => fetch('https://api.example.com/users'));
 * ```
 */
export class BoundaryKit {
  /**
   * Creates a new BoundaryKit, defaulting any omitted primitive.
   *
   * @param config - Composition configuration
   * @returns New BoundaryKit instance
   */
  static create(config: BoundaryKitConfigType = {}): BoundaryKit {
    const result = new this({
      'circuitBreaker': BoundaryKit.#resolveCircuitBreaker(config.circuitBreaker),
      'retry': BoundaryKit.#resolveRetry(config.retry),
      'throttle': BoundaryKit.#resolveThrottle(config.throttle)
    });
    return result;
  }

  static builder(): BoundaryKitBuilder {
    const result = BoundaryKitBuilder.create((config) => {
      const kit = BoundaryKit.create(config);
      return kit;
    });
    return result;
  }

  static #resolveCircuitBreaker(value: BoundaryKitConfigType['circuitBreaker']): CircuitBreaker {
    if (value instanceof CircuitBreaker) {
      return value;
    }
    const result = CircuitBreaker.create(value ?? DEFAULT_CIRCUIT_BREAKER_OPTIONS);
    return result;
  }

  static #resolveRetry(value: BoundaryKitConfigType['retry']): Retry {
    if (value instanceof Retry) {
      return value;
    }
    const result = Retry.create(value);
    return result;
  }

  static #resolveThrottle(value: BoundaryKitConfigType['throttle']): Throttle {
    if (value instanceof Throttle) {
      return value;
    }
    const result = Throttle.create(value);
    return result;
  }

  readonly #circuitBreaker: CircuitBreaker;
  readonly #retry: Retry;
  readonly #throttle: Throttle;

  protected constructor(deps: BoundaryKitDepsType) {
    this.#throttle = deps.throttle;
    this.#circuitBreaker = deps.circuitBreaker;
    this.#retry = deps.retry;
  }

  /**
   * Runs `fn` through the composed boundary: `throttle.execute(() => circuitBreaker.execute(() => retry.execute(fn)))`.
   *
   * Throttle bounds concurrency first, the circuit breaker fails fast before any retry
   * attempt is wasted against a known-broken dependency, and retry runs innermost against
   * the real call. See the class doc for the full rationale.
   *
   * @param fn - Async operation to run through the boundary
   * @returns The result of `fn`, after the throttle admits it, the circuit permits it,
   *   and retry succeeds
   *
   * @throws {BoundaryKitAbortedError} When the composed `Throttle` discards the call via
   *   its detach-and-abandon abort behavior, WITHOUT `fn` ever running — tracked
   *   explicitly (not inferred from an `undefined` result, which `Throttle#execute()`
   *   also produces whenever `fn` itself legitimately resolves `undefined`/`void`; see
   *   `getThrottle()` to observe abort state directly)
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let ran = false;

    const runRetryable = async (): Promise<T> => {
      const result = await this.#retry.execute(fn);
      ran = true;
      return result;
    };

    const runProtected = (): Promise<T> => {
      const result = this.#circuitBreaker.execute(runRetryable);
      return result;
    };

    const result = await this.#throttle.execute(runProtected);

    if (!ran) {
      throw new BoundaryKitAbortedError();
    }

    return result as T;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.#circuitBreaker;
  }

  getRetry(): Retry {
    return this.#retry;
  }

  getThrottle(): Throttle {
    return this.#throttle;
  }
}
