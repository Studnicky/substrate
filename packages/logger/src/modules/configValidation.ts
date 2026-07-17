import { ConfigurationError } from '../errors/ConfigurationError.js';

/**
 * Validation helpers for logger configuration fields.
 */
export const configValidation = {
  'assertPlainObject': function(value: unknown, field: string): void {
    if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      throw new ConfigurationError(`${field} must be a plain object`);
    }
  }
};
