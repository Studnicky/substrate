/**
 * Timeout validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateTimeout extends FetchConfigValidation {
  /**
   * Validates timeout configuration
   * Must be a non-negative finite number in milliseconds
   *
   * @param value - Timeout value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      this.onValidationError('timeout must be a number');
    }
    this.assertPositive(value, 'timeout');
    this.assertFinite(value, 'timeout');
  }
}
