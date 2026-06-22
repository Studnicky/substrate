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
export class SocketError extends Error {
  /**
   * The underlying undici error (undefined if not applicable)
   * Always present for V8 optimization
   */
  override readonly cause: Error | undefined;

  /**
   * Undici error code
   */
  readonly code: 'UND_ERR_SOCKET';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    super(`Socket error for ${url}`, cause !== undefined ? { 'cause': cause } : undefined);
    this.name = 'SocketError';
    this.code = 'UND_ERR_SOCKET';
    this.url = url;
    this.cause = cause;
  }
}
