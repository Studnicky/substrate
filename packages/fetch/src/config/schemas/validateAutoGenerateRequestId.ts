/**
 * Validates autoGenerateRequestId boolean flag
 */

import { FetchConfigValidation } from './FetchConfigValidation.js';

export class ValidateAutoGenerateRequestId extends FetchConfigValidation {
  /**
   * Validates autoGenerateRequestId boolean flag
   *
   * @param val - Value to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(val: unknown): void {
    this.assertBoolean(val, 'autoGenerateRequestId');
  }
}
