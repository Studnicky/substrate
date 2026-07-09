/**
 * BackoffStrategy validation schema
 */

import { ConfigurationError } from '@studnicky/config';
import { Guard } from '@studnicky/types';

/**
 * Internal validator for the backoffStrategy configuration parameter.
 */
class BackoffStrategyValidator {
  static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }
    if (!Guard.isObject(val)) {
      throw ConfigurationError.create('backoffStrategy must be an object with strategy and baseDelayMs');
    }
    if (!Guard.isFunction(val.strategy)) {
      throw ConfigurationError.create('backoffStrategy.strategy must be a function');
    }
    if (!Guard.isNumber(val.baseDelayMs)) {
      throw ConfigurationError.create('backoffStrategy.baseDelayMs must be a number');
    }
  }
}

/**
 * Single export matching filename
 */
const backoffStrategy = { 'validateBackoffStrategy': BackoffStrategyValidator.validate };

export { backoffStrategy };
