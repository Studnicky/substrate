/**
 * Error thrown when queue size limit is exceeded.
 *
 * Thrown by Mutex when attempting to acquire a lock while the wait queue
 * for that key has reached the configured maximum size.
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { MutexError } from './MutexError.js';

export class QueueSizeExceededError extends MutexError {
  public readonly key!: unknown;
  public readonly maxQueueSize!: number;

  private static buildMessage(fields: Readonly<{ 'key': unknown; 'maxQueueSize': number }>): string {
    const result = `Queue size exceeded for key "${String(fields.key)}". Maximum queue size is ${fields.maxQueueSize}.`;
    return result;
  }

  constructor(key: unknown, maxQueueSize: number) {
    const fields = { 'key': key, 'maxQueueSize': maxQueueSize };
    super(DomainErrorArgs.build(fields, {
      'code': 'mutex.queueSizeExceeded',
      'message': QueueSizeExceededError.buildMessage,
      'retryable': false
    }));
    Object.assign(this, fields);
  }
}
