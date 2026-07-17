/**
 * Hook timeout validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateHookTimeoutMs extends FetchConfigValidation {
  /**
   * Validates hookTimeoutMs configuration
   * Must be a non-negative finite number in milliseconds
   *
   * @param val - Hook timeout value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val !== undefined && val !== null && typeof val !== 'number') {
      this.onValidationError('hookTimeoutMs must be a number');
    }
    this.assertPositive(val, 'hookTimeoutMs');
    this.assertFinite(val, 'hookTimeoutMs');
  }
}
