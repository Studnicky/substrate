import type { CircuitBreaker } from '@studnicky/resilience';
import type { Retry } from '@studnicky/retry';
import type { Throttle } from '@studnicky/throttle';

/** Runtime dependencies composed by `BoundaryKit`. */
export interface BoundaryKitDepsInterface {
  readonly 'circuitBreaker': CircuitBreaker;
  readonly 'retry': Retry;
  readonly 'throttle': Throttle;
}
