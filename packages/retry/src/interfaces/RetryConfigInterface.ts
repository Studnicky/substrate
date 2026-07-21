import type { ErrorClassifierFunctionInterface, ErrorClassifierInterface } from '@studnicky/errors';

import type { BackoffConfigEntity } from '../entities/BackoffConfigEntity.js';
import type { RetryConfigEntity } from '../entities/RetryConfigEntity.js';
import type { BackoffStrategyInterface } from './BackoffStrategyInterface.js';

interface RetryBackoffConfigInterface extends BackoffConfigEntity.Type {
  readonly 'strategy': BackoffStrategyInterface;
}

/**
 * Runtime configuration contract for retry behavior.
 *
 * Composes the JSON-serializable {@link RetryConfigEntity.Type} with non-serializable
 * runtime members (errorClassifier, backoffStrategy). This interface is the full
 * contract accepted by {@link Retry.create}.
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
  readonly 'backoffStrategy'?: RetryBackoffConfigInterface;
  readonly 'errorClassifier'?: ErrorClassifierFunctionInterface | ErrorClassifierInterface;
}
