import type { DeadLetterQueueOptionsEntity } from '../entities/DeadLetterQueueOptionsEntity.js';

export interface DeadLetterQueueOptionsInterface extends DeadLetterQueueOptionsEntity.InputType {
  readonly 'clock'?: () => number;
  readonly 'signal'?: AbortSignal;
}
