/**
 * Error thrown when a fetch operation times out
 *
 * @example
 * ```typescript
 * import { get, TimeoutError } from '@studnicky/fetch';
 *
 * try {
 *   await get('https://slow-api.example.com/data', { timeout: 1000 });
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.error(`Timeout: ${error.url} exceeded ${error.timeoutMs}ms`);
 *   }
 * }
 * ```
 */
export class TimeoutError extends Error {
  /**
   * The URL that was fetched
   */
  readonly timeoutMs: number;

  /**
   * The timeout value in milliseconds
   */
  readonly url: string;

  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}
