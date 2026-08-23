/**
 * URL validation schema
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateURL extends FetchConfigValidation {
  /**
   * Validates URL configuration
   * Must be a valid, non-empty URL string
   *
   * @param value - URL value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    this.assertString(value, 'baseURL');
    if (value === undefined || value === null || typeof value !== 'string') {
      return;
    }

    if (value === '') {
      this.onValidationError('baseURL must not be empty');
    }

    try {
      new URL(value);
    } catch {
      this.onValidationError('baseURL must be a valid URL');
    }
  }
}
