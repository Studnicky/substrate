/**
 * Hook timeout validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateHookTimeoutMs extends FetchConfigValidation {
  /**
   * Validates hookTimeoutMs configuration
   * Must be a non-negative finite number in milliseconds
   *
   * @param value - Hook timeout value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      this.onValidationError('hookTimeoutMs must be a number');
    }
    this.assertPositive(value, 'hookTimeoutMs');
    this.assertFinite(value, 'hookTimeoutMs');
  }
}
