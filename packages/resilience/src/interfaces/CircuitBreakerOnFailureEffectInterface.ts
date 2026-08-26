import type { CircuitBreakerOnFailureEffectDiscriminantEntity } from '../entities/CircuitBreakerOnFailureEffectDiscriminantEntity.js';

/** CircuitBreakerMachine effect: reduce() decided CircuitBreaker.onFailure(error) must fire. */
export interface CircuitBreakerOnFailureEffectInterface extends CircuitBreakerOnFailureEffectDiscriminantEntity.Type {
  readonly 'error': Error;
  readonly 'variant': CircuitBreakerOnFailureEffectDiscriminantEntity.Type['variant'];
}
