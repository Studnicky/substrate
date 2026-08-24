/**
 * Checks if a value is greater than or equal to another value
 */

import type { FilterValue } from '../../types.js';

export class IsGreaterThanOrEqual {
  static isGreaterThanOrEqual(value: unknown, comparison: FilterValue): boolean   {
    if (typeof value === 'number' && typeof comparison === 'number') {
      return value >= comparison;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      return value >= comparison;
    }

    if (value instanceof Date && comparison instanceof Date) {
      return value.getTime() >= comparison.getTime();
    }

    return false;
  }
}
