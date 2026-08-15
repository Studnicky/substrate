import type { CircuitBreakerOnFailureEffectDiscriminantEntity } from '../entities/CircuitBreakerOnFailureEffectDiscriminantEntity.js';

/** CircuitBreakerMachine effect: reduce() decided CircuitBreaker.onFailure(error) must fire. `error` is the raw thrown value. */
export interface CircuitBreakerOnFailureEffectInterface extends CircuitBreakerOnFailureEffectDiscriminantEntity.Type {
  readonly 'error': unknown;
  readonly 'variant': CircuitBreakerOnFailureEffectDiscriminantEntity.Type['variant'];
}
