/**
 * Validates requestIdGenerator function
 */

import { ConfigurationError } from '../../errors/index.js';
import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateRequestIdGenerator extends FetchConfigValidation {
  /**
   * Validates requestIdGenerator function
   *
   * @param val - Value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    this.assertFunction(val, 'requestIdGenerator');
    if (val === undefined || val === null) {
      return;
    }

    // Test that the function returns a string
    try {
      const result = (val as () => string)();

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
