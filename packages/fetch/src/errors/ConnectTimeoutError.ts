/**
 * Error thrown when a connection timeout occurs (undici UND_ERR_CONNECT_TIMEOUT)
 *
 * This typically indicates connection pool exhaustion where all connections are busy
 * and new connections cannot be established within the timeout period.
 *
 * @example
 * ```typescript
 * import { FetchClient, ConnectTimeoutError } from '@studnicky/fetch';
 *
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof ConnectTimeoutError) {
 *     console.error('Connection timeout - pool may be exhausted');
 *   }
 * }
 * ```
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { FetchBaseError } from './FetchBaseError.js';

export class ConnectTimeoutError extends FetchBaseError {
  /**
   * Undici error code
   */
  readonly undiciCode!: 'UND_ERR_CONNECT_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url!: string;

  constructor(url: string, cause?: Error) {
    const fields = { 'undiciCode': 'UND_ERR_CONNECT_TIMEOUT' as const, 'url': url };
    super(DomainErrorArgs.build(fields, {
      'cause': cause,
      'code': 'fetch.connectTimeout',
      'message': (f) => { const result = `Connection timeout for ${f.url}`; return result; },
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}
