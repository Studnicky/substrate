/**
 * Error thrown when queue size limit is exceeded.
 *
 * Thrown by Mutex when attempting to acquire a lock while the wait queue
 * for that key has reached the configured maximum size.
 */
import { MutexError } from './MutexError.js';

export class QueueSizeExceededError extends MutexError {
  public readonly key: unknown;
  public readonly maxQueueSize: number;

  constructor(key: unknown, maxQueueSize: number) {
    super({
      'code': 'mutex.queueSizeExceeded',
      'message': `Queue size exceeded for key "${String(key)}". Maximum queue size is ${maxQueueSize}.`,
      'retryable': false
    });
    this.key = key;
    this.maxQueueSize = maxQueueSize;
  }
}
