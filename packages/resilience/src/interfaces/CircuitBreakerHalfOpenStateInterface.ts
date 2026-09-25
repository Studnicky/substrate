import type { CircuitBreakerHalfOpenStateEntity } from '../entities/CircuitBreakerHalfOpenStateEntity.js';

/** `successCount` is incremented internally by `reduce()`'s own arithmetic; never externally validated. */
export interface CircuitBreakerHalfOpenStateInterface {
  readonly 'successCount': number;
  readonly 'variant': CircuitBreakerHalfOpenStateEntity.Type['variant'];
}
