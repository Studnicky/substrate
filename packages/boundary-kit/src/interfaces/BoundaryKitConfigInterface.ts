/**
 * BoundaryKit configuration contract
 */

import type { CircuitBreaker, CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Throttle, ThrottleConfigEntity } from '@studnicky/throttle';

/**
 * Configuration accepted by `BoundaryKit.create()`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * a config shape that is passed to the primitive's own `create()`. `circuitBreaker`
 * has no zero-arg default the way `Throttle`/`Retry` do — `failureThreshold` and
 * `resetTimeoutMs` are required by `CircuitBreakerOptionsInterface` — so an omitted
 * `circuitBreaker` key resolves against `BoundaryKit`'s own defaults, not the bare
 * primitive's.
 */
export interface BoundaryKitConfigInterface {
  /**
   * A pre-built `CircuitBreaker` instance, or config passed to `CircuitBreaker.create()`.
   * Defaults to `{ failureThreshold: 5, resetTimeoutMs: 30_000 }` when omitted.
   */
  readonly 'circuitBreaker'?: CircuitBreaker | CircuitBreakerOptionsInterface;

  /**
   * A pre-built `Retry` instance, or config passed to `Retry.create()`.
   */
  readonly 'retry'?: RetryConfigInterface | Retry;

  /**
   * A pre-built `Throttle` instance, or config passed to `Throttle.create()`.
   */
  readonly 'throttle'?: ThrottleConfigEntity.Type | Throttle;
}
