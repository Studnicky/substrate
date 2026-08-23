/**
 * HookTimeoutMs validation schema
 */

import { ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the hookTimeoutMs configuration parameter.
 */
class HookTimeoutMsValidator {
  static validate(value: unknown): void {
    ConfigValidation.assertNumber(value, 'hookTimeoutMs');
    ConfigValidation.assertInteger(value, 'hookTimeoutMs');
    ConfigValidation.assertPositive(value, 'hookTimeoutMs');
  }
}

/**
 * Single export matching filename
 */
const hookTimeoutMs = { 'validateHookTimeoutMs': HookTimeoutMsValidator.validate };

export { hookTimeoutMs };
