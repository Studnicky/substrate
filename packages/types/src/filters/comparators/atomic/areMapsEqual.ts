/**
 * Compares two Map objects for deep equality
 */

import type { FilterCondition } from '../../types.js';

export class AreMapsEqual {
  static areMapsEqual(
    value: Map<unknown, unknown>,
    filterValue: Map<unknown, unknown>,
    condition: FilterCondition
  ): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }

    for (const [
      key,
      val
    ] of value) {
      if (!filterValue.has(key) || !AreMapsEqual.compareDeep(val, filterValue.get(key), condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Internal deep comparison function for Map values
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

    // Handle arrays
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      if (value.length !== filterValue.length) {
        return false;
      }
      for (let i = 0; i < value.length; i++) {
        if (!AreMapsEqual.compareDeep(value[i], filterValue[i], condition)) {
          return false;
        }
      }

      return true;
    }

    // Handle Maps recursively
    if (value instanceof Map && filterValue instanceof Map) {
      return AreMapsEqual.areMapsEqual(value, filterValue, condition);
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

        if (!AreMapsEqual.compareDeep(valueObj[key], filterObj[key], condition)) {
          return false;
        }
      }

      return true;
    }

    // Primitive comparison
    return value === filterValue;
  }
}
