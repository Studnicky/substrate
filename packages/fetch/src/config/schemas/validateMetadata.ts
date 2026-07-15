/**
 * Metadata validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateMetadata {
  /**
   * Validates metadata object
   * Metadata can contain any key-value pairs
   *
   * @param val - Metadata configuration to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== 'object' || Array.isArray(val)) {
      throw new ConfigurationError('metadata must be an object');
    }
  }
}
