/**
 * Error thrown when queue size limit is exceeded.
 *
 * Thrown by Mutex when attempting to acquire a lock while the wait queue
 * for that key has reached the configured maximum size.
 */
import { DomainErrorArgumentList } from '@studnicky/errors';

import { MutexError } from './MutexError.js';

export class QueueSizeExceededError extends MutexError {
  public readonly key: unknown;
  public readonly maximumQueueSize!: number;

  constructor(key: unknown, maximumQueueSize: number) {
    const fields = { 'key': key, 'maximumQueueSize': maximumQueueSize };
    super(DomainErrorArgumentList.build(fields, {
      'code': 'mutex.queueSizeExceeded',
      'message': (fields: Readonly<{ 'key': unknown; 'maximumQueueSize': number }>): string => {
        const result = `Queue size exceeded for key "${String(fields.key)}". Maximum queue size is ${fields.maximumQueueSize}.`;
        return result;
      },
      'retryable': false
    }));
    this.key = key;
    this.maximumQueueSize = maximumQueueSize;
  }
}
