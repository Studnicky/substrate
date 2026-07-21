import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';

/** Callable error classifier contract. */
export interface ErrorClassifierFunctionInterface {
  (error: Error, attemptNumber: number): ErrorClassificationEntity.Type;
}
