import type { RetryAttemptEventEntity } from '../entities/RetryAttemptEventEntity.js';
import type { RetryContextDataEntity } from '../entities/RetryContextDataEntity.js';
import type { RetrySuccessEventEntity } from '../entities/RetrySuccessEventEntity.js';

/**
 * Lifecycle topics emitted by Retry through an optional EventSinkInterface.
 */
export interface RetryEventTopicMapInterface {
  readonly 'attempt': RetryAttemptEventEntity.Type;
  readonly 'retryScheduled': RetryContextDataEntity.Type;
  readonly 'success': RetrySuccessEventEntity.Type;
}
