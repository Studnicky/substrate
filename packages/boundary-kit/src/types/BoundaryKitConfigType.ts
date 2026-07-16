/**
 * BoundaryKit configuration type
 */

import type { CircuitBreaker, CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Throttle, ThrottleConfigEntity } from '@studnicky/throttle';

/**
 * Configuration accepted by `BoundaryKit.create()` / `BoundaryKitBuilder`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * a config shape that is passed to the primitive's own `create()`. `circuitBreaker`
 * has no zero-arg default the way `Throttle`/`Retry` do — `failureThreshold` and
 * `resetTimeoutMs` are required by `CircuitBreakerOptionsInterface` — so an omitted
 * `circuitBreaker` key resolves against `BoundaryKit`'s own defaults, not the bare
 * primitive's.
 */
// json-schema-uninexpressible: fields are unions with live class instances (CircuitBreaker, Retry, Throttle), not plain JSON-serializable data
export type BoundaryKitConfigType = {
  /**
   * A pre-built `CircuitBreaker` instance, or config passed to `CircuitBreaker.create()`.
   * Defaults to `{ failureThreshold: 5, resetTimeoutMs: 30_000 }` when omitted.
   */
  'circuitBreaker'?: CircuitBreaker | CircuitBreakerOptionsInterface;

  /**
   * A pre-built `Retry` instance, or config passed to `Retry.create()`.
   */
  'retry'?: RetryConfigInterface | Retry;

  /**
   * A pre-built `Throttle` instance, or config passed to `Throttle.create()`.
   */
  'throttle'?: ThrottleConfigEntity.Type | Throttle;
};
