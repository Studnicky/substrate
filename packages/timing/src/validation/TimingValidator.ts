/**
 * Static validation methods for timing configuration values.
 * @internal
 */

import { ConfigurationError } from '@studnicky/config';

import { MAXIMUM_PRECISION, VALID_TIME_UNITS } from '../constants/index.js';

/**
 * Validation methods for timing configuration values.
 *
 * @public
 */
export class TimingValidator {
  /**
   * Validates the maximumEvents configuration value.
   * Accepts positive integers or Infinity. Undefined/null values pass validation.
   *
   * @param value - The value to validate
   * @throws ConfigurationError - When value is not a number, not an integer (unless Infinity), or less than 1
   *
   * @example
   * ```typescript
   * TimingValidator.validateMaximumEvents(100);      // OK
   * TimingValidator.validateMaximumEvents(Infinity); // OK
   * TimingValidator.validateMaximumEvents(-1);       // throws ConfigurationError
   * TimingValidator.validateMaximumEvents(1.5);      // throws ConfigurationError
   * ```
   */
  public static validateMaximumEvents(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw ConfigurationError.create('maximumEvents must be a number');
    }

    if (value !== Infinity && !Number.isInteger(value)) {
      throw ConfigurationError.create('maximumEvents must be an integer or Infinity');
    }

    if (Number.isFinite(value) && value < 1) {
      throw ConfigurationError.create('maximumEvents must be at least 1');
    }
  }

  /**
   * Validates the precision configuration value.
   * Validates all properties for valid time units and integer values.
   *
   * @param value - The value to validate
   * @throws ConfigurationError - When any property is invalid
   *
   * @example
   * ```typescript
   * TimingValidator.validatePrecision({ ms: 3, s: 6 }); // OK
   * TimingValidator.validatePrecision({ invalid: 3 }); // throws ConfigurationError
   * ```
   */
  public static validatePrecision(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (
      typeof value !== 'object'
      || Array.isArray(value)
      || !TimingValidator.isStringKeyedObject(value)
    ) {
      throw ConfigurationError.create('precision must be an object');
    }

    const validTimeUnits = new Set<string>(VALID_TIME_UNITS);

    const entries = Object.entries<unknown>(value);
    const entriesLength = entries.length;

    for (let index = 0; index < entriesLength; index += 1) {
      const entry = entries[index]!;
      const key = entry[0];
      const entryValue = entry[1];
      if (!validTimeUnits.has(key)) {
        throw ConfigurationError.create(`precision contains invalid time unit "${key}". Valid units: ${VALID_TIME_UNITS.join(', ')}`);
      }

      if (typeof entryValue !== 'number' || Number.isNaN(entryValue)) {
        throw ConfigurationError.create(`precision.${key} must be a number`);
      }

      if (!Number.isInteger(entryValue)) {
        throw ConfigurationError.create(`precision.${key} must be an integer`);
      }

      if (entryValue < 0 || entryValue > MAXIMUM_PRECISION) {
        throw ConfigurationError.create(`precision.${key} must be between 0 and ${MAXIMUM_PRECISION}`);
      }
    }
  }

  private static isStringKeyedObject(_value: object): _value is Record<string, unknown> {
    return true;
  }
}
