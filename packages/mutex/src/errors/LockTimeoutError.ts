/**
 * Error thrown when lock acquisition times out
 *
 * Thrown by Mutex when a lock cannot be acquired within the configured
 * timeout period. The error message includes the key and timeout duration.
 */
export class LockTimeoutError extends Error {
  constructor(key: unknown, timeout: number) {
    super(`Lock acquisition timed out for key "${String(key)}" after ${timeout}ms.`);
    this.name = 'LockTimeoutError';
  }
}
