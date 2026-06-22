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
export class BodyTimeoutError extends Error {
  /**
   * The underlying undici error (undefined if not applicable)
   * Always present for V8 optimization
   */
  override readonly cause: Error | undefined;

  /**
   * Undici error code
   */
  readonly code: 'UND_ERR_BODY_TIMEOUT';

  /**
   * The URL that was being requested
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    super(`Body timeout for ${url}`, cause !== undefined ? { 'cause': cause } : undefined);
    this.name = 'BodyTimeoutError';
    this.code = 'UND_ERR_BODY_TIMEOUT';
    this.url = url;
    this.cause = cause;
  }
}
