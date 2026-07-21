import type { DeadLetterQueue } from '../DeadLetterQueue.js';
import type { DeadLetterQueueRetryGeneratorOptionsEntity } from '../entities/DeadLetterQueueRetryGeneratorOptionsEntity.js';

export interface DeadLetterQueueRetryGeneratorOptionsInterface<T>
  extends DeadLetterQueueRetryGeneratorOptionsEntity.Type {
  readonly 'dlq': DeadLetterQueue<T>;
}
