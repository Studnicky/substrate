/**
 * Validates requestIdGenerator function
 */

import { ConfigurationError } from '../../errors/index.js';
import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateRequestIdGenerator extends FetchConfigValidation {
  /**
   * Validates requestIdGenerator function
   *
   * @param value - Value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'function') {
      this.onValidationError('requestIdGenerator must be a function');
    }

    // Test that the function returns a string
    try {
      const result: unknown = Reflect.apply(value, undefined, []);

      if (typeof result !== 'string') {
        this.onValidationError('requestIdGenerator must return a string');
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      this.onValidationError(`requestIdGenerator function error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
