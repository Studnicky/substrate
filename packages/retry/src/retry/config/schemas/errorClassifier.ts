/**
 * ErrorClassifier validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Validates errorClassifier parameter
 */
function validateErrorClassifier(val: unknown): void {
  ConfigValidation.assertFunctionOrObjectWithMethod(val, 'classify', 'errorClassifier');
}

/**
 * Single export matching filename
 */
const errorClassifier = { 'validateErrorClassifier': validateErrorClassifier };

export { errorClassifier };
