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
export class HeadersTimeoutError extends Error {
  /**
   * The underlying undici error (undefined if not applicable)
   * Always present for V8 optimization
   */
  override readonly cause: Error | undefined;

  /**
   * Undici error code
   */
  readonly code: 'UND_ERR_HEADERS_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    super(`Headers timeout for ${url}`, cause !== undefined ? { 'cause': cause } : undefined);
    this.name = 'HeadersTimeoutError';
    this.code = 'UND_ERR_HEADERS_TIMEOUT';
    this.url = url;
    this.cause = cause;
  }
}
