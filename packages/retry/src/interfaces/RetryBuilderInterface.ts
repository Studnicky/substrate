import type { ErrorClassifierFunctionType, ErrorClassifierInterface } from '@studnicky/errors';

import type { RetryConfigInterface } from './RetryConfigInterface.js';
import type { RetryInterface } from './RetryInterface.js';

/**
 * Fluent builder for constructing Retry instances with custom error classification and backoff strategies.
 */
export interface RetryBuilderInterface<T extends RetryInterface = RetryInterface> {
  /**
   * Set backoff strategy for computing retry delays
   */
  backoffStrategy(value: NonNullable<RetryConfigInterface['backoffStrategy']>): this;

  /**
   * Build and return Retry instance
   */
  build(): T;

  /**
   * Set error classifier for determining retry behavior
   */
  errorClassifier(value: ErrorClassifierFunctionType | ErrorClassifierInterface): this;

  /**
   * Set the timeout (ms) each lifecycle hook is raced against
   */
  hookTimeoutMs(value: number): this;

  /**
   * Set maximum total elapsed time across all attempts (ms)
   */
  maxElapsedMs(value: number): this;

  /**
   * Set maximum number of retry attempts
   */
  maxRetries(value: number): this;
}
