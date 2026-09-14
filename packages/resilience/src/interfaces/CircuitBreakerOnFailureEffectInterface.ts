import type { CircuitBreakerOnFailureEffectEntity } from '../entities/CircuitBreakerOnFailureEffectEntity.js';

/** CircuitBreakerMachine effect: reduce() decided CircuitBreaker.onFailure(error) must fire. */
export interface CircuitBreakerOnFailureEffectInterface extends CircuitBreakerOnFailureEffectEntity.Type {
  readonly 'error': Error;
}
