/**
 * Boundary Kit — composes throttle, circuit breaker, and retry into a fixed-order boundary call pattern
 */

import { CircuitBreaker } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import { Throttle } from '@studnicky/throttle';

import type { BoundaryKitConfigInterface } from './interfaces/BoundaryKitConfigInterface.js';
import type { BoundaryKitDepsInterface } from './interfaces/BoundaryKitDepsInterface.js';

import { BOUNDARY_KIT_DEFAULTS } from './constants/BOUNDARY_KIT_DEFAULTS.js';
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
 * in); callers retain those original references for direct observation.
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
  static create(config: BoundaryKitConfigInterface = {}): BoundaryKit {
    const result = new this({
      'circuitBreaker': BoundaryKit.#resolveCircuitBreaker(config.circuitBreaker),
      'retry': BoundaryKit.#resolveRetry(config.retry),
      'throttle': BoundaryKit.#resolveThrottle(config.throttle)
    });
    return result;
  }

  static #resolveCircuitBreaker(value: BoundaryKitConfigInterface['circuitBreaker']): CircuitBreaker {
    if (value instanceof CircuitBreaker) {
      return value;
    }
    const result = CircuitBreaker.create(value ?? BOUNDARY_KIT_DEFAULTS.circuitBreakerOptions);
    return result;
  }

  static #resolveRetry(value: BoundaryKitConfigInterface['retry']): Retry {
    if (value instanceof Retry) {
      return value;
    }
    const result = Retry.create(value);
    return result;
  }

  static #resolveThrottle(value: BoundaryKitConfigInterface['throttle']): Throttle {
    if (value instanceof Throttle) {
      return value;
    }
    const result = Throttle.create(value);
    return result;
  }

  readonly #circuitBreaker: CircuitBreaker;
  readonly #retry: Retry;
  readonly #throttle: Throttle;

  protected constructor(deps: BoundaryKitDepsInterface) {
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
   *   also produces whenever `fn` itself legitimately resolves `undefined`/`void`)
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let completion: readonly [T] | undefined;

    const runRetryable = async (): Promise<T> => {
      const result = await this.#retry.execute(fn);
      completion = [result];
      return result;
    };

    const runProtected = (): Promise<T> => {
      const result = this.#circuitBreaker.execute(runRetryable);
      return result;
    };

    await this.#throttle.execute(runProtected);

    if (completion === undefined) {
      throw new BoundaryKitAbortedError();
    }

    return completion[0];
  }
}
