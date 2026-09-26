import type { DeadLetterQueue } from '../DeadLetterQueue.js';
import type { DeadLetterQueueRetryGeneratorOptionsEntity } from '../entities/DeadLetterQueueRetryGeneratorOptionsEntity.js';

export interface DeadLetterQueueRetryGeneratorOptionsInterface<T>
  extends DeadLetterQueueRetryGeneratorOptionsEntity.InputType {
  /** Nullable: the constructor rejects a missing queue with `ResilienceConfigError` at runtime. */
  readonly 'deadLetterQueue': DeadLetterQueue<T> | null | undefined;
}
