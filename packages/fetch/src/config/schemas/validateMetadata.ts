/**
 * Metadata validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateMetadata {
  /**
   * Validates metadata object
   * Metadata can contain any key-value pairs
   *
   * @param value - Metadata configuration to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigurationError('metadata must be an object');
    }
  }
}
