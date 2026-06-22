/**
 * Error thrown when an HTTP error status is received (4xx or 5xx)
 * Use this for explicit HTTP error handling rather than checking response.ok
 *
 * @example
 * ```typescript
 * import { get, HTTPError } from '@studnicky/fetch';
 *
 * // Using a response interceptor to throw on HTTP errors
 * const api = FetchClient.create({
 *   baseURL: 'https://api.example.com',
 *   responseInterceptor: async (response) => {
 *     if (!response.ok) {
 *       throw new HTTPError(response.url, response);
 *     }
 *     return response;
 *   }
 * });
 *
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
export class HTTPError extends Error {
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
    super(`HTTP ${response.status} ${response.statusText}: ${url}`);
    this.name = 'HTTPError';
    this.url = url;
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
  }
}
