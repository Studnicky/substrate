/**
 * Error thrown when timing configuration is invalid.
 *
 * @public
 *
 * @example
 * ```typescript
 * try {
 *   Timing.create({ maxEvents: -1 });
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.error('Invalid configuration:', error.message);
 *   }
 * }
 * ```
 */
export class ConfigurationError extends Error {
  /**
   * Creates a new ConfigurationError.
   * @param message - Description of the configuration validation failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';

    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}
