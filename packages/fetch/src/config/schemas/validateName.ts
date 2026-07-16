/**
 * Name validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Name validation
 */
export class ValidateName {
  /**
   * Validates name configuration
   * Must be a non-empty string
   *
   * @param val - Name value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== 'string') {
      throw new ConfigurationError('name must be a string');
    }

    if (val === '') {
      throw new ConfigurationError('name must not be empty');
    }
  }
}
