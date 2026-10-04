import { ResilienceError } from './errors/ResilienceError.js';

export class DeadLetterQueueFullError extends ResilienceError {
  public override readonly name: string = 'DeadLetterQueueFullError';

  constructor() {
    super({ 'code': 'resilience.dlqFull', 'message': 'Dead letter queue is full', 'retryable': false });
  }
}
