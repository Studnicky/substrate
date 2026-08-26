/**
 * Checks if a numeric value is close to another within a specified precision
 *
 * Useful for floating-point arithmetic comparisons where exact equality
 * may not be reliable due to precision issues.
 *
 * @param value - The numeric value to test
 * @param expected - The expected numeric value to compare against
 * @param precision - The decimal precision for comparison (default: 2)
 * @returns true if values are close within the specified precision, false otherwise
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

export class IsCloseTo {
  static isCloseTo(value: unknown, expected: FilterValueEntity.Type, precision = 2): boolean   {
    if (typeof value !== 'number' || typeof expected !== 'number') {
      return false;
    }

    if (!Number.isFinite(value) || !Number.isFinite(expected)) {
      const result = value === expected;
      return result;
    }

    const pass = Math.abs(expected - value) < Math.pow(10, -precision) / 2;

    return pass;
  }
}
