/**
 * HookTimeoutMs validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the hookTimeoutMs configuration parameter.
 */
class HookTimeoutMsValidator {
  static validate(val: unknown): void {
    ConfigValidation.assertNumber(val, 'hookTimeoutMs');
    ConfigValidation.assertInteger(val, 'hookTimeoutMs');
    ConfigValidation.assertPositive(val, 'hookTimeoutMs');
  }
}

/**
 * Single export matching filename
 */
const hookTimeoutMs = { 'validateHookTimeoutMs': HookTimeoutMsValidator.validate };

export { hookTimeoutMs };
