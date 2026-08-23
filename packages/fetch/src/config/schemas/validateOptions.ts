/**
 * Fetch options validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

/**
 * Validators for known Fetch API options
 * Each validator checks the type and value constraints for its option
 */
const optionValidators = new Map<string, (value: unknown) => void>([
  ['body', () => {
    // Body can be any type
  }],
  ['cache', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('cache must be a string');
    }
    const validCache = [
      'default',
      'no-store',
      'reload',
      'no-cache',
      'force-cache',
      'only-if-cached'
    ];

    if (!validCache.includes(value)) {
      throw new ConfigurationError(`cache must be one of: ${validCache.join(', ')}`);
    }
  }],
  ['credentials', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('credentials must be a string');
    }
    const validCredentials = [
      'omit',
      'same-origin',
      'include'
    ];

    if (!validCredentials.includes(value)) {
      throw new ConfigurationError(`credentials must be one of: ${validCredentials.join(', ')}`);
    }
  }],
  ['headers', () => {
    // Headers are validated separately by headers validator
  }],
  ['integrity', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('integrity must be a string');
    }
  }],
  ['keepalive', (value: unknown) => {
    if (typeof value !== 'boolean') {
      throw new ConfigurationError('keepalive must be a boolean');
    }
  }],
  ['method', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('method must be a string');
    }
    const validMethods = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
      'CONNECT',
      'TRACE'
    ];

    if (!validMethods.includes(value.toUpperCase())) {
      throw new ConfigurationError(`method must be one of: ${validMethods.join(', ')}`);
    }
  }],
  ['mode', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('mode must be a string');
    }
    const validModes = [
      'cors',
      'no-cors',
      'same-origin',
      'navigate'
    ];

    if (!validModes.includes(value)) {
      throw new ConfigurationError(`mode must be one of: ${validModes.join(', ')}`);
    }
  }],
  ['redirect', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('redirect must be a string');
    }
    const validRedirect = [
      'follow',
      'error',
      'manual'
    ];

    if (!validRedirect.includes(value)) {
      throw new ConfigurationError(`redirect must be one of: ${validRedirect.join(', ')}`);
    }
  }],
  ['referrer', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('referrer must be a string');
    }
  }],
  ['referrerPolicy', (value: unknown) => {
    if (typeof value !== 'string') {
      throw new ConfigurationError('referrerPolicy must be a string');
    }
    const validPolicies = [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url'
    ];

    if (value !== '' && !validPolicies.includes(value)) {
      throw new ConfigurationError(`referrerPolicy must be one of: ${validPolicies.join(', ')}`);
    }
  }],
  ['signal', (value: unknown) => {
    if (value !== undefined && value !== null && !(value instanceof AbortSignal)) {
      throw new ConfigurationError('signal must be an AbortSignal instance');
    }
  }],
  ['timeout', (value: unknown) => {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number') {
        throw new ConfigurationError('timeout must be a number');
      }
      if (value <= 0) {
        throw new ConfigurationError('timeout must be positive');
      }
      if (!Number.isFinite(value)) {
        throw new ConfigurationError('timeout must be finite');
      }
    }
  }]
]);

/**
 * Validates options object
 * Validates known Fetch API options, allows unknown options
 */
export class ValidateOptions {
  /**
   * @param value - Fetch options configuration to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigurationError('options must be an object');
    }

    const optionNames = Object.keys(value);
    const optionNameLength = optionNames.length;
    for (let index = 0; index < optionNameLength; index += 1) {
      const key = optionNames[index];
      if (key === undefined) {
        continue;
      }
      const optionValue: unknown = Reflect.get(value, key);
      const validator = optionValidators.get(key);

      if (validator !== undefined) {
        validator(optionValue);
      }
      // Unknown options are allowed (custom options)
    }
  }
}
