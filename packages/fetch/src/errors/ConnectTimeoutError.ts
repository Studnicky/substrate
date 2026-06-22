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
export class ConnectTimeoutError extends Error {
  /**
   * The underlying undici error (undefined if not applicable)
   * Always present for V8 optimization
   */
  override readonly cause: Error | undefined;

  /**
   * Undici error code
   */
  readonly code: 'UND_ERR_CONNECT_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    super(`Connection timeout for ${url}`, cause !== undefined ? { 'cause': cause } : undefined);
    this.name = 'ConnectTimeoutError';
    this.code = 'UND_ERR_CONNECT_TIMEOUT';
    this.url = url;
    this.cause = cause;
  }
}
