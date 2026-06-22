/**
 * Precision validation schema.
 * @internal
 */

import type { PrecisionConfigType } from '../../interfaces/PrecisionConfigType.js';

import { MAX_PRECISION, VALID_TIME_UNITS } from '../../constants/index.js';
import { ConfigurationError } from '../../errors/ConfigurationError.js';

/**
 * Validates the precision configuration value.
 * Validates all properties for valid time units and integer values.
 *
 * @param val - The value to validate
 * @throws ConfigurationError - When any property is invalid
 *
 * @example
 * ```typescript
 * validatePrecision({ ms: 3, s: 6 }); // OK
 * validatePrecision({ invalid: 3 }); // throws ConfigurationError
 * ```
 */
export function validatePrecision(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }

  if (typeof val !== 'object' || Array.isArray(val)) {
    throw new ConfigurationError('precision must be an object');
  }

  const config = val as PrecisionConfigType;

  for (const [
    key,
    value
  ] of Object.entries(config)) {
    if (!VALID_TIME_UNITS.includes(key as typeof VALID_TIME_UNITS[number])) {
      throw new ConfigurationError(`precision contains invalid time unit "${key}". Valid units: ${VALID_TIME_UNITS.join(', ')}`);
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ConfigurationError(`precision.${key} must be a number`);
    }

    if (!Number.isInteger(value)) {
      throw new ConfigurationError(`precision.${key} must be an integer`);
    }

    if (value < 0 || value > MAX_PRECISION) {
      throw new ConfigurationError(`precision.${key} must be between 0 and ${MAX_PRECISION}`);
    }
  }
}
