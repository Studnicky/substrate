/**
 * Name validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

/**
 * Name validation
 */
export class ValidateName extends FetchConfigValidation {
  /**
   * Validates name configuration
   * Must be a non-empty string
   *
   * @param val - Name value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    this.assertString(val, 'name');
    if (val === '') {
      this.onValidationError('name must not be empty');
    }
  }
}
