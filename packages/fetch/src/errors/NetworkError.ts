/**
 * Error thrown when a network-level failure occurs during fetch
 * This includes DNS resolution failures, connection refused, network unreachable, etc.
 *
 * @example
 * ```typescript
 * import { get, NetworkError } from '@studnicky/fetch';
 *
 * try {
 *   await get('https://invalid-domain-that-doesnt-exist.com/api');
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.error(`Network error: ${error.url}`);
 *     if (error.cause) {
 *       console.error(`Cause: ${error.cause.message}`);
 *     }
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * The underlying error that caused the network failure
   */
  override readonly cause: Error | undefined;

  /**
   * The URL that was fetched
   */
  readonly url: string;

  constructor(url: string, cause?: Error) {
    const causeMessage = cause !== undefined ? `: ${cause.message}` : '';

    super(`Network error for ${url}${causeMessage}`);
    this.name = 'NetworkError';
    this.url = url;
    this.cause = cause;
  }
}
