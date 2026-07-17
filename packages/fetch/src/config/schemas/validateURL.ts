/**
 * URL validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateURL extends FetchConfigValidation {
  /**
   * Validates URL configuration
   * Must be a valid, non-empty URL string
   *
   * @param val - URL value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    this.assertString(val, 'baseURL');
    if (val === undefined || val === null || typeof val !== 'string') {
      return;
    }

    if (val === '') {
      this.onValidationError('baseURL must not be empty');
    }

    try {
      new URL(val);
    } catch {
      this.onValidationError('baseURL must be a valid URL');
    }
  }
}
