import { ResilienceError } from './errors/ResilienceError.js';

export class DeadLetterQueueAbortedError extends ResilienceError {
  constructor() {
    super({ 'code': 'resilience.dlqAborted', 'message': 'Dead letter queue is aborted', 'retryable': false });
  }
}
