import type {
  ErrorClassifierFunctionInterface,
  ErrorClassifierInterface
} from '@studnicky/errors/browser';

/** Typed collaborators `CircuitBreaker.create` accepts alongside schema-validated options. */
export interface CircuitBreakerCollaboratorsInterface {
  readonly 'clock'?: () => number;

  /**
   * Classifies a thrown error to determine whether it counts toward the failure
   * threshold. Takes precedence over `classifyError()` when supplied. See
   * {@link CircuitBreaker.classifyError} for the subclass override path. This is
   * the same `@studnicky/errors` classifier family `@studnicky/resilience/retry/node`'s
   * `Retry` class uses.
   */
  readonly 'errorClassifier'?: ErrorClassifierFunctionInterface | ErrorClassifierInterface;
}
