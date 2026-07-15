/**
 * Timeout validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateTimeout {
  /**
   * Validates timeout configuration
   * Must be a non-negative finite number in milliseconds
   *
   * @param val - Timeout value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== 'number') {
      throw new ConfigurationError('timeout must be a number');
    }

    if (val <= 0) {
      throw new ConfigurationError('timeout must be positive');
    }

    if (!Number.isFinite(val)) {
      throw new ConfigurationError('timeout must be finite');
    }
  }
}
