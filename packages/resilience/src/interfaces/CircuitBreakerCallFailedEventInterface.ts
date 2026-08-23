import type { CircuitBreakerCallFailedEventDiscriminantEntity } from '../entities/CircuitBreakerCallFailedEventDiscriminantEntity.js';

/** `CircuitBreakerMachine` event: the wrapped call produced a non-retryable error. */
export interface CircuitBreakerCallFailedEventInterface extends CircuitBreakerCallFailedEventDiscriminantEntity.Type {
  readonly 'at': CircuitBreakerCallFailedEventDiscriminantEntity.Type['at'];
  readonly 'error': Error;
  readonly 'type': CircuitBreakerCallFailedEventDiscriminantEntity.Type['type'];
}
