/**
 * BackoffStrategy validation schema
 */

import { ConfigurationError } from '@studnicky/config';
import { Guard } from '@studnicky/types';

/**
 * Internal validator for the backoffStrategy configuration parameter.
 */
class BackoffStrategyValidator {
  static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }
    if (!Guard.isObject(value)) {
      throw ConfigurationError.create('backoffStrategy must be an object with strategy and baseDelayMs');
    }
    if (!Guard.isFunction(value.strategy)) {
      throw ConfigurationError.create('backoffStrategy.strategy must be a function');
    }
    if (!Guard.isNumber(value.baseDelayMs)) {
      throw ConfigurationError.create('backoffStrategy.baseDelayMs must be a number');
    }
  }
}

/**
 * Single export matching filename
 */
const backoffStrategy = { 'validateBackoffStrategy': BackoffStrategyValidator.validate };

export { backoffStrategy };
