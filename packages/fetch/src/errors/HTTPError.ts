/**
 * Error thrown when an HTTP error status is received (4xx or 5xx)
 * Use this for explicit HTTP error handling rather than checking response.ok
 *
 * @example
 * ```typescript
 * import { FetchClient, HTTPError } from '@studnicky/fetch';
 * import type { ResponseContextInterface } from '@studnicky/fetch';
 *
 * // Subclass and override onResponse to throw on HTTP error status
 * class StrictClient extends FetchClient {
 *   protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
 *     if (!context.response.ok) {
 *       throw new HTTPError(context.response.url, context.response);
 *     }
 *     return context;
 *   }
 * }
 *
 * const api = StrictClient.create({ baseURL: 'https://api.example.com' });
 * try {
 *   await api.get('/users/99999');
 * } catch (error) {
 *   if (error instanceof HTTPError) {
 *     console.error(`HTTP ${error.status}: ${error.statusText}`);
 *     const body = await error.response.json();
 *     console.error(body);
 *   }
 * }
 * ```
 */
import { FetchBaseError } from './FetchBaseError.js';

export class HTTPError extends FetchBaseError {
  /**
   * The Response object for accessing headers and body
   */
  readonly response: Response;

  /**
   * HTTP status code (e.g., 404, 500)
   */
  readonly status: number;

  /**
   * HTTP status text (e.g., "Not Found", "Internal Server Error")
   */
  readonly statusText: string;

  /**
   * The URL that was fetched
   */
  readonly url: string;

  constructor(url: string, response: Response) {
    super({
      'code': 'fetch.httpError',
      'message': `HTTP ${response.status} ${response.statusText}: ${url}`,
      'retryable': response.status >= 500
    });
    this.url = url;
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
  }
}
