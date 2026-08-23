/**
 * MaxElapsedMs validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the maximumElapsedMs configuration parameter.
 */
class MaximumElapsedMsValidator {
  static validate(value: unknown): void {
    ConfigValidation.assertNumber(value, 'maximumElapsedMs');
    ConfigValidation.assertInteger(value, 'maximumElapsedMs');
    ConfigValidation.assertNonNegative(value, 'maximumElapsedMs');
  }
}

/**
 * Single export matching filename
 */
const maximumElapsedMs = { 'validateMaximumElapsedMs': MaximumElapsedMsValidator.validate };

export { maximumElapsedMs };
