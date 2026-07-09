import type { ErrorClassifierFunctionType, ErrorClassifierInterface } from '@studnicky/errors';

import type { RetryConfigEntity } from '../entities/RetryConfigEntity.js';
import type { BackoffStrategyType } from '../types/BackoffStrategyType.js';

/**
 * Runtime configuration contract for retry behavior.
 *
 * Composes the JSON-serializable {@link RetryConfigEntity.Type} with non-serializable
 * runtime members (errorClassifier, backoffStrategy). This interface is the full
 * contract accepted by {@link Retry} and {@link RetryBuilder}.
 *
 * Schema validation covers only the JSON subset (maxRetries). Runtime members are
 * validated by the Retry construction path.
 */
export interface RetryConfigInterface extends RetryConfigEntity.Type {
  /**
   * Config-based backoff. When supplied, the default `onRetryScheduled` body
   * computes `context.delayMs = strategy(context.attemptNumber, baseDelayMs)`.
   * Takes precedence over the default (no-op) `onRetryScheduled` body — a
   * subclass that overrides `onRetryScheduled` bypasses this entirely.
   */
  readonly 'backoffStrategy'?: {
    readonly 'baseDelayMs': number;
    readonly 'strategy': BackoffStrategyType;
  };
  readonly 'errorClassifier'?: ErrorClassifierFunctionType | ErrorClassifierInterface;
}
