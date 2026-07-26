/**
 * Error thrown when body timeout occurs (undici UND_ERR_BODY_TIMEOUT)
 *
 * Indicates the response body was not received within the configured timeout period.
 *
 * @example
 * ```typescript
 * import { BodyTimeoutError } from '@studnicky/fetch';
 *
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof BodyTimeoutError) {
 *     console.error('Body timeout');
 *   }
 * }
 * ```
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { FetchBaseError } from './FetchBaseError.js';

export class BodyTimeoutError extends FetchBaseError {
  /**
   * Undici error code
   */
  readonly undiciCode!: 'UND_ERR_BODY_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url!: string;

  private static buildMessage(fields: Readonly<{ 'undiciCode': 'UND_ERR_BODY_TIMEOUT'; 'url': string }>): string {
    const result = `Body timeout for ${fields.url}`;
    return result;
  }

  constructor(url: string, cause?: Error) {
    const fields = { 'undiciCode': 'UND_ERR_BODY_TIMEOUT' as const, 'url': url };
    super(DomainErrorArgs.build(fields, {
      'cause': cause,
      'code': 'fetch.bodyTimeout',
      'message': BodyTimeoutError.buildMessage,
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}
