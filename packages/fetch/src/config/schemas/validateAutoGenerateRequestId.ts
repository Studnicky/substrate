/**
 * Validates autoGenerateRequestId boolean flag
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateAutoGenerateRequestId {
  /**
   * Validates autoGenerateRequestId boolean flag
   *
   * @param val - Value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'boolean') {
      throw new ConfigurationError('autoGenerateRequestId must be a boolean');
    }
  }
}
