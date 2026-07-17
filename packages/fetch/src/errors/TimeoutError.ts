/**
 * Error thrown when a fetch operation times out
 *
 * @example
 * ```typescript
 * import { get, TimeoutError } from '@studnicky/fetch';
 *
 * try {
 *   await get('https://slow-api.example.com/data', { timeout: 1000 });
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.error(`Timeout: ${error.url} exceeded ${error.timeoutMs}ms`);
 *   }
 * }
 * ```
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { FetchBaseError } from './FetchBaseError.js';

export class TimeoutError extends FetchBaseError {
  /**
   * The URL that was fetched
   */
  readonly timeoutMs!: number;

  /**
   * The timeout value in milliseconds
   */
  readonly url!: string;

  constructor(url: string, timeoutMs: number) {
    const fields = { 'timeoutMs': timeoutMs, 'url': url };
    super(DomainErrorArgs.build(fields, {
      'code': 'fetch.timeout',
      'message': (f) => { const result = `Request to ${f.url} timed out after ${f.timeoutMs}ms`; return result; },
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}
