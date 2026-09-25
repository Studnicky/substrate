import type { DeadLetterQueue } from '../DeadLetterQueue.js';
import type { DeadLetterQueueRetryGeneratorOptionsEntity } from '../entities/DeadLetterQueueRetryGeneratorOptionsEntity.js';

export interface DeadLetterQueueRetryGeneratorOptionsInterface<T>
  extends DeadLetterQueueRetryGeneratorOptionsEntity.InputType {
  readonly 'deadLetterQueue': DeadLetterQueue<T>;
}
