/**
 * RetryInterceptor validation schema
 */

import { ConfigurationError, ConfigValidation } from '@studnicky/config';

/**
 * Internal validator for the retryInterceptor configuration option.
 * Accepts a single function or an array of functions.
 */
class RetryInterceptorValidator {
  static validate(val: unknown): void {
    if (val === undefined || val === null) {
      return;
    }

    if (Array.isArray(val)) {
      const valLen = val.length;
      for (let i = 0; i < valLen; i++) {
        if (typeof val[i] !== 'function') {
          throw ConfigurationError.create(`retryInterceptor[${i}] must be a function`);
        }
      }

      return;
    }

    ConfigValidation.assertFunction(val, 'retryInterceptor');
  }
}

const retryInterceptor = { 'validateRetryInterceptor': RetryInterceptorValidator.validate };

export { retryInterceptor };
