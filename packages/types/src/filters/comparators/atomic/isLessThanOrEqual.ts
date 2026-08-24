/**
 * Checks if a value is less than or equal to another value
 */

import type { FilterValue } from '../../types.js';

export function isLessThanOrEqual(value: unknown, comparison: FilterValue): boolean {
  if (typeof value === 'number' && typeof comparison === 'number') {
    return value <= comparison;
  }

  if (typeof value === 'string' && typeof comparison === 'string') {
    return value <= comparison;
  }

  if (value instanceof Date && comparison instanceof Date) {
    return value.getTime() <= comparison.getTime();
  }

  return false;
}
