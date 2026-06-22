/**
 * Error thrown when queue size limit is exceeded
 *
 * Thrown by Mutex when attempting to acquire a lock while the wait queue
 * for that key has reached the configured maximum size.
 */
export class QueueSizeExceededError extends Error {
  constructor(key: unknown, maxQueueSize: number) {
    super(`Queue size exceeded for key "${String(key)}". Maximum queue size is ${maxQueueSize}.`);
    this.name = 'QueueSizeExceededError';
  }
}
