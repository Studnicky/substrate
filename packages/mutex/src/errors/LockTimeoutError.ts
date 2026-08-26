/**
 * Error thrown when lock acquisition times out.
 *
 * Thrown by Mutex when a lock cannot be acquired within the configured
 * timeout period. The error message includes the key and timeout duration.
 */
import { MutexError } from './MutexError.js';

export class LockTimeoutError<K extends PropertyKey> extends MutexError {
  public readonly key: K;
  public readonly timeoutMs: number;

  constructor(key: K, timeoutMs: number) {
    super({
      'code': 'mutex.lockTimeout',
      'message': `Lock acquisition timed out for key "${String(key)}" after ${timeoutMs}ms.`,
      'retryable': true
    });
    this.key = key;
    this.timeoutMs = timeoutMs;
  }
}
