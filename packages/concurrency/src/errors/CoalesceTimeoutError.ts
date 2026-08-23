/**
 * Concrete error for a caller whose `Coalesce.run()` timeout elapsed.
 *
 * @module
 */
import { DomainErrorArgumentList } from '@studnicky/errors';

import { ConcurrencyError } from './ConcurrencyError.js';

/**
 * Thrown when a single caller's configured `timeout` elapses before the
 * shared in-flight promise for its key settles. Only that caller's `run()`
 * rejects — the in-flight entry is left untouched for other callers still
 * waiting on it.
 */
export class CoalesceTimeoutError extends ConcurrencyError {
  public readonly key!: string;
  public readonly timeoutMs!: number;

  public constructor(key: string, timeoutMs: number) {
    const fields = { 'key': key, 'timeoutMs': timeoutMs };
    super(DomainErrorArgumentList.build(fields, {
      'code': 'concurrency.coalesceTimeout',
      'message': (messageFields): string => {
        const result = `Coalesce.run() timed out for key "${messageFields.key}" after ${messageFields.timeoutMs}ms.`;
        return result;
      },
      'retryable': true
    }));
    this.key = fields.key;
    this.timeoutMs = fields.timeoutMs;
  }
}
