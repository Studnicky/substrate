/**
 * Response interceptor validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Validates response interceptor configuration
 * Accepts single interceptor function or array of interceptor functions
 *
 * @param val - Response interceptor(s) to validate
 * @throws ConfigurationError if validation fails
 */
export function validateResponseInterceptor(val: unknown): void {
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
      throw new ConfigurationError('responseInterceptor array must contain only functions');
    }

    return;
  }

  throw new ConfigurationError('responseInterceptor must be a function or array of functions');
}
