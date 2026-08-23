/**
 * Validates autoGenerateRequestId boolean flag
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateAutoGenerateRequestId extends FetchConfigValidation {
  /**
   * Validates autoGenerateRequestId boolean flag
   *
   * @param value - Value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    this.assertBoolean(value, 'autoGenerateRequestId');
  }
}
