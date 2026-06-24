/**
 * MaxRetries validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the maxRetries configuration parameter.
 */
class MaxRetriesValidator {
  static validate(val: unknown): void {
    ConfigValidation.assertNumber(val, 'maxRetries');
    ConfigValidation.assertInteger(val, 'maxRetries');
    ConfigValidation.assertNonNegative(val, 'maxRetries');
  }
}

/**
 * Single export matching filename
 */
const maxRetries = { 'validateMaxRetries': MaxRetriesValidator.validate };

export { maxRetries };
