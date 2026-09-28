import type { CircuitBreaker } from '@studnicky/resilience/browser';
import type { Retry } from '@studnicky/retry/browser';
import type { Throttle } from '@studnicky/throttle/browser';

/** Runtime dependencies composed by `BoundaryKit`. */
export interface BoundaryKitDepsInterface {
  readonly 'circuitBreaker': CircuitBreaker;
  readonly 'retry': Retry;
  readonly 'throttle': Throttle;
}
