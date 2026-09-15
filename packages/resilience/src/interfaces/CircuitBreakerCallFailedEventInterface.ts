import type { CircuitBreakerCallFailedEventEntity } from '../entities/CircuitBreakerCallFailedEventEntity.js';

/** `CircuitBreakerMachine` event: the wrapped call produced a non-retryable error. */
export interface CircuitBreakerCallFailedEventInterface extends CircuitBreakerCallFailedEventEntity.Type {
  readonly 'error': Error;
}
