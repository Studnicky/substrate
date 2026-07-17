/**
 * Error thrown when headers timeout occurs (undici UND_ERR_HEADERS_TIMEOUT)
 *
 * Indicates the response headers were not received within the configured timeout period.
 *
 * @example
 * ```typescript
 * import { HeadersTimeoutError } from '@studnicky/fetch';
 *
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof HeadersTimeoutError) {
 *     console.error('Headers timeout');
 *   }
 * }
 * ```
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { FetchBaseError } from './FetchBaseError.js';

export class HeadersTimeoutError extends FetchBaseError {
  /**
   * Undici error code
   */
  readonly undiciCode: 'UND_ERR_HEADERS_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    const fields = { 'url': url };
    super(DomainErrorArgs.build(fields, {
      'cause': cause,
      'code': 'fetch.headersTimeout',
      'message': (f) => { const result = `Headers timeout for ${f.url}`; return result; },
      'retryable': true
    }));
    this.undiciCode = 'UND_ERR_HEADERS_TIMEOUT';
    this.url = url;
  }
}
