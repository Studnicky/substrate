import type { ErrorClassifierFunctionInterface, ErrorClassifierInterface } from '@studnicky/errors';

import type { CircuitBreakerOptionsEntity } from '../entities/CircuitBreakerOptionsEntity.js';

export interface CircuitBreakerOptionsInterface extends CircuitBreakerOptionsEntity.Type {
  readonly 'clock'?: () => number;

  /**
   * Classifies a thrown error to determine whether it counts toward the failure
   * threshold. Takes precedence over `classifyError()` when supplied. See
   * {@link CircuitBreaker.classifyError} for the subclass override path. This is
   * the same `@studnicky/errors` classifier family `@studnicky/retry`'s `Retry`
   * class uses.
   */
  readonly 'errorClassifier'?: ErrorClassifierFunctionInterface | ErrorClassifierInterface;
}
