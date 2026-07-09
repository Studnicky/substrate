/**
 * Concrete error for a caller whose `Coalesce.run()` timeout elapsed.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/**
 * Thrown when a single caller's configured `timeout` elapses before the
 * shared in-flight promise for its key settles. Only that caller's `run()`
 * rejects — the in-flight entry is left untouched for other callers still
 * waiting on it.
 */
export class CoalesceTimeoutError extends ConcurrencyError {
  public readonly key: string;
  public readonly timeoutMs: number;

  public constructor(key: string, timeoutMs: number) {
    super({
      'code': 'concurrency.coalesceTimeout',
      'message': `Coalesce.run() timed out for key "${key}" after ${timeoutMs}ms.`,
      'retryable': true
    });
    this.key = key;
    this.timeoutMs = timeoutMs;
  }
}
