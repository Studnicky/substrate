import type { EventSinkInterface } from '@studnicky/event-bus/interfaces';

import type { BackoffConfigEntity } from '../entities/BackoffConfigEntity.js';
import type { RetryConfigEntity } from '../entities/RetryConfigEntity.js';
import type { BackoffStrategyInterface } from './BackoffStrategyInterface.js';
import type { RetryCollaboratorsInterface } from './RetryCollaboratorsInterface.js';
import type { RetryEventTopicMapInterface } from './RetryEventTopicMapInterface.js';

interface RetryBackoffConfigInterface extends BackoffConfigEntity.InputType {
  readonly 'strategy': BackoffStrategyInterface;
}

/**
 * Runtime configuration contract for retry behavior.
 *
 * Composes the JSON-serializable {@link RetryConfigEntity.Type} with non-serializable
 * runtime members (errorClassifier, backoffStrategy). This interface is the full
 * contract accepted by {@link Retry.create}.
 *
 * The configuration intake parses the JSON subset and verifies the runtime-member
 * contracts before Retry construction uses them.
 */
export interface RetryConfigInterface
  extends RetryConfigEntity.InputType, RetryCollaboratorsInterface {
  readonly 'backoffStrategy'?: RetryBackoffConfigInterface;
  /** Optional lifecycle-event publisher. Publication failures are advisory. */
  readonly 'eventSink'?: EventSinkInterface<RetryEventTopicMapInterface>;
}
