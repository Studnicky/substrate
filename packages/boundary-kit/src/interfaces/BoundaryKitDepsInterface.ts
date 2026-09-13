import type { CircuitBreaker } from '@studnicky/resilience/node';
import type { Retry } from '@studnicky/retry/node';
import type { Throttle } from '@studnicky/throttle/node';

/** Runtime dependencies composed by `BoundaryKit`. */
export interface BoundaryKitDepsInterface {
  readonly 'circuitBreaker': CircuitBreaker;
  readonly 'retry': Retry;
  readonly 'throttle': Throttle;
}
