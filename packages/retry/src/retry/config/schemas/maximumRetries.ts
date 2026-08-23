/**
 * MaxRetries validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the maximumRetries configuration parameter.
 */
class MaximumRetriesValidator {
  static validate(value: unknown): void {
    ConfigValidation.assertNumber(value, 'maximumRetries');
    ConfigValidation.assertInteger(value, 'maximumRetries');
    ConfigValidation.assertNonNegative(value, 'maximumRetries');
  }
}

/**
 * Single export matching filename
 */
const maximumRetries = { 'validateMaximumRetries': MaximumRetriesValidator.validate };

export { maximumRetries };
