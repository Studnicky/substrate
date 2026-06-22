/**
 * MaxRetries validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Validates maxRetries parameter
 */
function validateMaxRetries(val: unknown): void {
  ConfigValidation.assertNumber(val, 'maxRetries');
  ConfigValidation.assertInteger(val, 'maxRetries');
  ConfigValidation.assertNonNegative(val, 'maxRetries');
}

/**
 * Single export matching filename
 */
const maxRetries = { 'validateMaxRetries': validateMaxRetries };

export { maxRetries };
