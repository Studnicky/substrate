import { ResilienceError } from './errors/ResilienceError.js';

export class DeadLetterQueueClosedError extends ResilienceError {
  constructor() {
    super({ 'code': 'resilience.dlqClosed', 'message': 'Dead letter queue is closed', 'retryable': false });
  }
}
