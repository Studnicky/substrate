/**
 * Compares two arrays for deep equality
 */

import type { FilterConditionInterface } from '../../interfaces.js';

export class AreArraysEqual {
  static areArraysEqual(value: unknown[], filterValue: unknown[], condition: FilterConditionInterface = {}) : boolean {
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
  private static compareDeep(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}) : boolean {
    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    // Handle null/undefined
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      const result = value === filterValue;
      return result;
    }

    // Handle arrays recursively
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      const result = AreArraysEqual.areArraysEqual(value, filterValue, condition);
      return result;
    }

    // Handle objects
    if (typeof value === 'object' && typeof filterValue === 'object') {
      const keys1 = Object.keys(value);
      const keys2 = Object.keys(filterValue);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (let i = 0; i < keys1.length; i++) {
        const key = keys1.at(i);
        if (key === undefined || !Object.hasOwn(filterValue, key)) {
          return false;
        }
        const valueRecord = value as Record<string, unknown>;
        const filterRecord = filterValue as Record<string, unknown>;

        if (!AreArraysEqual.compareDeep(valueRecord[key], filterRecord[key], condition)) {
          return false;
        }
      }

      return true;
    }

    // Primitive comparison
    const result = value === filterValue;
    return result;
  }
}
