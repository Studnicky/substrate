/**
 * Max events validation schema.
 * @internal
 */

import { ConfigurationError } from '../../errors/ConfigurationError.js';

/**
 * Validates the maxEvents configuration value.
 * Accepts positive integers or Infinity. Undefined/null values pass validation.
 *
 * @param val - The value to validate
 * @throws ConfigurationError - When value is not a number, not an integer (unless Infinity), or less than 1
 *
 * @example
 * ```typescript
 * validateMaxEvents(100);      // OK
 * validateMaxEvents(Infinity); // OK
 * validateMaxEvents(-1);       // throws ConfigurationError
 * validateMaxEvents(1.5);      // throws ConfigurationError
 * ```
 */
export function validateMaxEvents(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }

  if (typeof val !== 'number' || Number.isNaN(val)) {
    throw new ConfigurationError('maxEvents must be a number');
  }

  if (val !== Infinity && !Number.isInteger(val)) {
    throw new ConfigurationError('maxEvents must be an integer or Infinity');
  }

  if (Number.isFinite(val) && val < 1) {
    throw new ConfigurationError('maxEvents must be at least 1');
  }
}
