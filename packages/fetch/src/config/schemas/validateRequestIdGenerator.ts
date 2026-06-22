/**
 * Validates requestIdGenerator function
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Validates requestIdGenerator function
 *
 * @param val - Value to validate
 * @throws ConfigurationError if validation fails
 */
export function validateRequestIdGenerator(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }
  if (typeof val !== 'function') {
    throw new ConfigurationError('requestIdGenerator must be a function');
  }

  // Test that the function returns a string
  try {
    const result = (val as () => string)();

    if (typeof result !== 'string') {
      throw new ConfigurationError('requestIdGenerator must return a string');
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError(`requestIdGenerator function error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
