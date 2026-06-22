/**
 * Headers validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Validates headers object
 * All header values must be strings
 *
 * @param val - Headers configuration to validate
 * @throws ConfigurationError if validation fails
 */
export function validateHeaders(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }

  if (typeof val !== 'object' || Array.isArray(val)) {
    throw new ConfigurationError('headers must be an object');
  }

  const headersObj = val as Record<string, unknown>;

  for (const [
    key,
    value
  ] of Object.entries(headersObj)) {
    if (typeof value !== 'string') {
      throw new ConfigurationError(`header value for "${key}" must be a string`);
    }
  }
}
