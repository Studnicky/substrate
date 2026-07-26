/**
 * Error thrown when a socket error occurs (undici UND_ERR_SOCKET)
 *
 * Indicates low-level socket issues such as connection refused, reset, or other socket failures.
 *
 * @example
 * ```typescript
 * import { SocketError } from '@studnicky/fetch';
 *
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof SocketError) {
 *     console.error('Socket error:', error.message);
 *   }
 * }
 * ```
 */
import { DomainErrorArgs } from '@studnicky/errors';

import { FetchBaseError } from './FetchBaseError.js';

export class SocketError extends FetchBaseError {
  /**
   * Undici error code
   */
  readonly undiciCode!: 'UND_ERR_SOCKET';

  /**
   * The URL that was being requested
   */
  readonly url!: string;

  private static buildMessage(fields: Readonly<{ 'undiciCode': 'UND_ERR_SOCKET'; 'url': string }>): string {
    const result = `Socket error for ${fields.url}`;
    return result;
  }

  constructor(url: string, cause?: Error) {
    const fields = { 'undiciCode': 'UND_ERR_SOCKET' as const, 'url': url };
    super(DomainErrorArgs.build(fields, {
      'cause': cause,
      'code': 'fetch.socketError',
      'message': SocketError.buildMessage,
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}
