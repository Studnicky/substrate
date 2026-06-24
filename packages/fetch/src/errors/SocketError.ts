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
import { FetchBaseError } from './FetchBaseError.js';

export class SocketError extends FetchBaseError {
  /**
   * Undici error code
   */
  readonly undiciCode: 'UND_ERR_SOCKET';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'fetch.socketError', 'message': `Socket error for ${url}`, 'retryable': true });
    this.undiciCode = 'UND_ERR_SOCKET';
    this.url = url;
  }
}
