/**
 * Error thrown when a fetch operation is aborted via AbortController
 *
 * @example
 * ```typescript
 * import { fetch, AbortError } from '@studnicky/fetch';
 *
 * const controller = new AbortController();
 * setTimeout(() => controller.abort('User cancelled'), 1000);
 *
 * try {
 *   await fetch('https://api.example.com/data', {
 *     signal: controller.signal
 *   });
 * } catch (error) {
 *   if (error instanceof AbortError) {
 *     console.error(`Aborted: ${error.url}`);
 *   }
 * }
 * ```
 */
export class AbortError extends Error {
  /**
   * The URL that was fetched
   */
  readonly url: string;

  constructor(url: string, reason?: string) {
    super(`Request to ${url} was aborted${(reason !== undefined && reason !== '') ? `: ${reason}` : ''}`);
    this.name = 'AbortError';
    this.url = url;
  }
}
