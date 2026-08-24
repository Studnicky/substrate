/**
 * Checks if a value is greater than another value
 *
 * Supports comparison of numbers, strings (lexicographic), and dates.
 *
 * @param value - The value to compare
 * @param comparison - The value to compare against
 * @returns true if value is greater than comparison, false otherwise
 */

import type { FilterValue } from '../../types.js';

export function isGreaterThan(value: unknown, comparison: FilterValue): boolean {
  if (typeof value === 'number' && typeof comparison === 'number') {
    return value > comparison;
  }

  if (typeof value === 'string' && typeof comparison === 'string') {
    return value > comparison;
  }

  if (value instanceof Date && comparison instanceof Date) {
    return value.getTime() > comparison.getTime();
  }

  return false;
}
