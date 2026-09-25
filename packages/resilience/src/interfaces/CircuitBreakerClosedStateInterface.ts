import type { CircuitBreakerClosedStateEntity } from '../entities/CircuitBreakerClosedStateEntity.js';

/** `failureCount` is incremented internally by `reduce()`'s own arithmetic; never externally validated. */
export interface CircuitBreakerClosedStateInterface {
  readonly 'failureCount': number;
  readonly 'variant': CircuitBreakerClosedStateEntity.Type['variant'];
}
