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

  constructor(key: unknown, maxQueueSize: number) {
    const fields = { 'key': key, 'maxQueueSize': maxQueueSize };
    super(DomainErrorArgs.build(fields, {
      'code': 'mutex.queueSizeExceeded',
      'message': (f) => { const result = `Queue size exceeded for key "${String(f.key)}". Maximum queue size is ${f.maxQueueSize}.`; return result; },
      'retryable': false
    }));
    Object.assign(this, fields);
  }
}
