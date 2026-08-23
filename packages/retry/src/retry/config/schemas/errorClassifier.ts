/**
 * ErrorClassifier validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the errorClassifier configuration parameter.
 */
class ErrorClassifierValidator {
  static validate(value: unknown): void {
    ConfigValidation.assertFunctionOrObjectWithMethod(value, 'classify', 'errorClassifier');
  }
}

/**
 * Single export matching filename
 */
const errorClassifier = { 'validateErrorClassifier': ErrorClassifierValidator.validate };

export { errorClassifier };
