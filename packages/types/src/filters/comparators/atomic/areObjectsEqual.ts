/**
 * Compares two plain objects for deep equality
 */

import type { FilterConditionInterface } from '../../interfaces.js';

export class AreObjectsEqual {
  static areObjectsEqual(
    value: Record<string, unknown>,
    filterValue: Record<string, unknown>,
    condition: FilterConditionInterface
  ): boolean {
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

      if (!AreObjectsEqual.compareDeep(value[key], filterValue[key], condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Internal deep comparison function for object properties
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

    // Handle arrays
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      if (value.length !== filterValue.length) {
        return false;
      }
      for (let i = 0; i < value.length; i++) {
        if (!AreObjectsEqual.compareDeep(value[i], filterValue[i], condition)) {
          return false;
        }
      }

      return true;
    }

    // Handle objects recursively
    if (typeof value === 'object' && typeof filterValue === 'object') {
      const result = AreObjectsEqual.areObjectsEqual(value as Record<string, unknown>, filterValue as Record<string, unknown>, condition);
      return result;
    }

    // Primitive comparison
    const result = value === filterValue;
    return result;
  }
}
