/**
 * ErrorClassifier validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the errorClassifier configuration parameter.
 */
class ErrorClassifierValidator {
  static validate(val: unknown): void {
    ConfigValidation.assertFunctionOrObjectWithMethod(val, 'classify', 'errorClassifier');
  }
}

/**
 * Single export matching filename
 */
const errorClassifier = { 'validateErrorClassifier': ErrorClassifierValidator.validate };

export { errorClassifier };
