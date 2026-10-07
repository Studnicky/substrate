import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
import type { ErrorClassifierInterface } from '@studnicky/errors/interfaces';

import { ErrorWithCodeEntity, ErrorWithStatusEntity } from '@studnicky/errors/entities';
import { ErrorClassifier, HttpStatus, matchers } from '@studnicky/errors/node';

import { DEFAULT_HTTP_ERROR_CLASSIFIER_CONSTANTS } from './constants/index.js';

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
export class DefaultHttpErrorClassifier
  extends ErrorClassifier
  implements ErrorClassifierInterface
{
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
   * const result = classifier.classify(RuntimeError.create('503 Service Unavailable'), 0);
   * // result.retryable === true
   * // result.reason === 'Gateway error (503)'
   * ```
   */
  classify(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
    const byStatus = ErrorWithStatusEntity.validate(error)
      ? this.classifyByStatus(error.status)
      : undefined;
    if (byStatus !== undefined) {
      return byStatus;
    }

    const byNetwork = this.classifyNetworkError(error);
    if (byNetwork !== undefined) {
      return byNetwork;
    }

    if (attemptNumber < DEFAULT_HTTP_ERROR_CLASSIFIER_CONSTANTS.earlyRetryThreshold) {
      const result = this.retryable('Unknown error (will retry)');
      return result;
    }

    const result = this.nonRetryable('Unknown error');
    return result;
  }

  /** HTTP-status-driven classification. Returns `undefined` when no status rule matches. */
  private classifyByStatus(status: number): ErrorClassificationEntity.Type | undefined {
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
    if (status === DEFAULT_HTTP_ERROR_CLASSIFIER_CONSTANTS.requestTimeoutStatus) {
      const result = this.retryable('Request timeout');
      return result;
    }
    if (matchers.http.isClientError(status)) {
      const result = this.nonRetryable(`Client error (${status})`);
      return result;
    }
    return undefined;
  }

  /** Network-code and network-message classification. Returns `undefined` when neither matches. */
  private classifyNetworkError(error: Error): ErrorClassificationEntity.Type | undefined {
    if (
      ErrorWithCodeEntity.validate(error) &&
      (matchers.network.isConnectionError(error.code) || matchers.network.isTimeout(error.code))
    ) {
      const result = this.retryable('Network error');
      return result;
    }
    if (this.messageContains(error, 'timeout', 'network', 'connection refused', 'socket hang up')) {
      const result = this.retryable('Network error');
      return result;
    }
    return undefined;
  }
}
