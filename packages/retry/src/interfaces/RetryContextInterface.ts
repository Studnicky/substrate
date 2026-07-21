import type { ErrorClassificationEntity } from '@studnicky/errors';

import type { RequestStatsEntity } from '../entities/RequestStatsEntity.js';
import type { RetryConfigEntity } from '../entities/RetryConfigEntity.js';
import type { RetryContextDataEntity } from '../entities/RetryContextDataEntity.js';

/**
 * Mutable runtime context provided to the `onRetryScheduled` lifecycle hook.
 *
 * The Error instance and caller-defined state make this a runtime contract;
 * request statistics remain a schema-derived, read-only snapshot.
 */
export interface RetryContextInterface<TState = Record<string, unknown>> {
  /** Set to true to abort remaining retries immediately. */
  'abort'?: RetryContextDataEntity.Type['abort'];

  /** Current attempt number (0-indexed). */
  'attemptNumber': RetryContextDataEntity.Type['attemptNumber'];

  /** Classification result from the error classifier. */
  'classification': ErrorClassificationEntity.Type;

  /** Milliseconds to delay before the next retry. */
  'delayMs': RetryContextDataEntity.Type['delayMs'];

  /** Total elapsed time since the first attempt. */
  'elapsedMs': RetryContextDataEntity.Type['elapsedMs'];

  /** Error that triggered this retry. */
  'error': Error;

  /** Maximum number of configured retries. */
  'maxRetries': RetryConfigEntity.Type['maxRetries'];

  /** Caller-defined mutable state that persists across attempts. */
  'state': TState;

  /** Current request statistics snapshot. */
  'stats': Readonly<RequestStatsEntity.Type>;
}
