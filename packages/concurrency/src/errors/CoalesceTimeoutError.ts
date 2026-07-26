/**
 * Concrete error for a caller whose `Coalesce.run()` timeout elapsed.
 *
 * @module
 */
import { DomainErrorArgs } from '@studnicky/errors';

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

  private static buildMessage(fields: Readonly<{ 'key': string; 'timeoutMs': number }>): string {
    const result = `Coalesce.run() timed out for key "${fields.key}" after ${fields.timeoutMs}ms.`;
    return result;
  }

  public constructor(key: string, timeoutMs: number) {
    const fields = { 'key': key, 'timeoutMs': timeoutMs };
    super(DomainErrorArgs.build(fields, {
      'code': 'concurrency.coalesceTimeout',
      'message': CoalesceTimeoutError.buildMessage,
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}
