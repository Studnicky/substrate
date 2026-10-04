import { ResilienceError } from './errors/ResilienceError.js';

export class DeadLetterQueueClosedError extends ResilienceError {
  public override readonly name: string = 'DeadLetterQueueClosedError';

  constructor() {
    super({ 'code': 'resilience.dlqClosed', 'message': 'Dead letter queue is closed', 'retryable': false });
  }
}
