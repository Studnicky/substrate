import type { CircuitBreakerCallFailedEventDiscriminantEntity } from '../entities/CircuitBreakerCallFailedEventDiscriminantEntity.js';

/** `CircuitBreakerMachine` event: the wrapped call threw a non-retryable error. `error` is the raw thrown value. */
export interface CircuitBreakerCallFailedEventInterface extends CircuitBreakerCallFailedEventDiscriminantEntity.Type {
  readonly 'at': CircuitBreakerCallFailedEventDiscriminantEntity.Type['at'];
  readonly 'error': unknown;
  readonly 'type': CircuitBreakerCallFailedEventDiscriminantEntity.Type['type'];
}
