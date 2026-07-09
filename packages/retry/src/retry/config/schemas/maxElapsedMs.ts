/**
 * MaxElapsedMs validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the maxElapsedMs configuration parameter.
 */
class MaxElapsedMsValidator {
  static validate(val: unknown): void {
    ConfigValidation.assertNumber(val, 'maxElapsedMs');
    ConfigValidation.assertInteger(val, 'maxElapsedMs');
    ConfigValidation.assertNonNegative(val, 'maxElapsedMs');
  }
}

/**
 * Single export matching filename
 */
const maxElapsedMs = { 'validateMaxElapsedMs': MaxElapsedMsValidator.validate };

export { maxElapsedMs };
