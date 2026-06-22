/**
 * Error thrown when configuration validation fails
 *
 * @example
 * ```typescript
 * import { FetchClient, ConfigurationError } from '@studnicky/fetch';
 *
 * try {
 *   const client = FetchClient.create({
 *     baseURL: 'not-a-valid-url',
 *     timeout: -1000
 *   });
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.error('Invalid configuration:', error.message);
 *   }
 * }
 * ```
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
