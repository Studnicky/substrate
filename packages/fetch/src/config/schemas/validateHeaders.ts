/**
 * Headers validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateHeaders {
  /**
   * Validates headers object
   * All header values must be strings
   *
   * @param value - Headers configuration to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigurationError('headers must be an object');
    }

    const headerNames = Object.keys(value);
    const headerNameLength = headerNames.length;
    for (let index = 0; index < headerNameLength; index += 1) {
      const key = headerNames[index];
      if (key === undefined) {
        continue;
      }
      const headerValue: unknown = Reflect.get(value, key);
      if (typeof headerValue !== 'string') {
        throw new ConfigurationError(`header value for "${key}" must be a string`);
      }
    }
  }
}
