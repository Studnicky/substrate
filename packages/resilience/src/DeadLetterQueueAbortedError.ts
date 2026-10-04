import { ResilienceError } from './errors/ResilienceError.js';

export class DeadLetterQueueAbortedError extends ResilienceError {
  public override readonly name: string = 'DeadLetterQueueAbortedError';

  constructor() {
    super({ 'code': 'resilience.dlqAborted', 'message': 'Dead letter queue is aborted', 'retryable': false });
  }
}
