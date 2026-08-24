/**
 * Compares two arrays for deep equality
 */

import type { FilterCondition } from '../../types.js';

export class AreArraysEqual {
  static areArraysEqual(value: unknown[], filterValue: unknown[], condition: FilterCondition = {}) : boolean {
    if (value.length !== filterValue.length) {
      return false;
    }

    const valueLength = value.length;

    for (let i = 0; i < valueLength; i++) {
      // Recursive deep comparison for array elements
      if (!AreArraysEqual.compareDeep(value[i], filterValue[i], condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Internal deep comparison function to avoid circular dependencies
   */
  private static compareDeep(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean {
    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    // Handle null/undefined
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      return value === filterValue;
    }

    // Handle arrays recursively
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      return AreArraysEqual.areArraysEqual(value, filterValue, condition);
    }

    // Handle objects
    if (typeof value === 'object' && typeof filterValue === 'object') {
      const keys1 = Object.keys(value);
      const keys2 = Object.keys(filterValue);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (const key of keys1) {
        if (!Object.prototype.hasOwnProperty.call(filterValue, key)) {
          return false;
        }
        const valueObj = value as Record<string, unknown>;
        const filterObj = filterValue as Record<string, unknown>;

        if (!AreArraysEqual.compareDeep(valueObj[key], filterObj[key], condition)) {
          return false;
        }
      }

      return true;
    }

    // Primitive comparison
    return value === filterValue;
  }
}
