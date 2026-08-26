import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';
import type { ErrorClassifierInterface } from '../interfaces/index.js';

import {
  EARLY_RETRY_THRESHOLD,
  HTTP_REQUEST_TIMEOUT
} from '../constants/ClassifierConstants.js';
import { HttpStatus } from '../constants/index.js';
import { ErrorWithCodeEntity } from '../entities/ErrorWithCodeEntity.js';
import { ErrorWithStatusEntity } from '../entities/ErrorWithStatusEntity.js';
import { ErrorClassifier } from './ErrorClassifier.js';
import { matchers } from './matchers.js';

/**
 * Default HTTP error classifier
 *
 * Provides sensible defaults for HTTP status code classification:
 * - 429 (Rate Limited): Retryable
 * - 502, 503, 504 (Gateway errors): Retryable
 * - 500-599 (Server errors): Retryable
 * - 408 (Request Timeout): Retryable
 * - 400-499 (Client errors): Non-retryable
 * - Network errors (ECONNREFUSED, ETIMEDOUT, etc.): Retryable
 *
 * @example Basic usage
 * ```typescript
 * const classifier = DefaultHttpErrorClassifier.create();
 * const classification = classifier.classify(error, 0);
 * ```
 */
export class DefaultHttpErrorClassifier extends ErrorClassifier implements ErrorClassifierInterface {
  static create<TInstance extends DefaultHttpErrorClassifier = DefaultHttpErrorClassifier>(
    this: new () => TInstance
  ): TInstance {
    return new this();
  }

  public constructor() {
    super();
  }

  /**
   * Classify an error to determine if it should be retried.
   *
   * Evaluates HTTP status codes and network error patterns to determine
   * whether the operation is transient (retryable) or permanent (non-retryable).
   *
   * @param error - The error to classify
   * @param attemptNumber - Current attempt number (0-indexed), used for unknown errors
   * @returns Classification indicating whether the error is retryable and why
   *
   * @example
   * ```typescript
   * const classifier = DefaultHttpErrorClassifier.create();
   * const result = classifier.classify(new Error('503 Service Unavailable'), 0);
   * // result.retryable === true
   * // result.reason === 'Gateway error (503)'
   * ```
   */
  classify(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
    if (ErrorWithStatusEntity.validate(error)) {
      const status = error.status;

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        const result = this.retryable('Rate limited');
        return result;
      }

      if (matchers.http.isGatewayError(status)) {
        const result = this.retryable(`Gateway error (${status})`);
        return result;
      }

      if (matchers.http.isServerError(status)) {
        const result = this.retryable(`Server error (${status})`);
        return result;
      }

      if (status === HTTP_REQUEST_TIMEOUT) {
        const result = this.retryable('Request timeout');
        return result;
      }

      if (matchers.http.isClientError(status)) {
        const result = this.nonRetryable(`Client error (${status})`);
        return result;
      }
    }

    if (ErrorWithCodeEntity.validate(error)
        && (matchers.network.isConnectionError(error.code) || matchers.network.isTimeout(error.code))) {
      const result = this.retryable('Network error');
      return result;
    }

    if (this.messageContains(error, 'timeout', 'network', 'connection refused', 'socket hang up')) {
      const result = this.retryable('Network error');
      return result;
    }

    if (attemptNumber < EARLY_RETRY_THRESHOLD) {
      const result = this.retryable('Unknown error (will retry)');
      return result;
    }

    const result = this.nonRetryable('Unknown error');
    return result;
  }
}
