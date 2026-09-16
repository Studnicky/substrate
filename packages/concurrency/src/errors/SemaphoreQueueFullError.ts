/**
 * Thrown when a semaphore cannot accept another queued acquisition.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/** Signals that a semaphore's configured waiting capacity is exhausted. */
export class SemaphoreQueueFullError extends ConcurrencyError {
  public readonly maximumQueueSize: number;

  public constructor(maximumQueueSize: number) {
    super({
      'code': 'concurrency.semaphoreQueueFull',
      'message': `Semaphore queue is full (maximumQueueSize: ${maximumQueueSize}).`,
      'retryable': true
    });
    this.maximumQueueSize = maximumQueueSize;
  }
}
