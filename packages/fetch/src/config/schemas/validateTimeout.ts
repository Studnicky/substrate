/**
 * Timeout validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateTimeout extends FetchConfigValidation {
  /**
   * Validates timeout configuration
   * Must be a non-negative finite number in milliseconds
   *
   * @param val - Timeout value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val !== undefined && val !== null && typeof val !== 'number') {
      this.onValidationError('timeout must be a number');
    }
    this.assertPositive(val, 'timeout');
    this.assertFinite(val, 'timeout');
  }
}
