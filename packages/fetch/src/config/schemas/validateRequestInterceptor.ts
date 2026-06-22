/**
 * Request interceptor validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Validates request interceptor configuration
 * Accepts single interceptor function or array of interceptor functions
 *
 * @param val - Request interceptor(s) to validate
 * @throws ConfigurationError if validation fails
 */
export function validateRequestInterceptor(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }

  if (typeof val === 'function') {
    return;
  }

  if (Array.isArray(val)) {
    if (!val.every((item) => {
      return typeof item === 'function';
    })) {
      throw new ConfigurationError('requestInterceptor array must contain only functions');
    }

    return;
  }

  throw new ConfigurationError('requestInterceptor must be a function or array of functions');
}
