/**
 * Compares two Map objects for deep equality
 */

import type { FilterConditionInterface } from '../../interfaces.js';

export class AreMapsEqual {
  static areMapsEqual(
    value: Map<unknown, unknown>,
    filterValue: Map<unknown, unknown>,
    condition: FilterConditionInterface
  ): boolean {
    if (value.size !== filterValue.size) {
      return false;
    }

    for (const [
      key,
      entryValue
    ] of value) {
      if (!filterValue.has(key) || !AreMapsEqual.compareDeep(entryValue, filterValue.get(key), condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Internal deep comparison function for Map values
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
        if (!AreMapsEqual.compareDeep(value[i], filterValue[i], condition)) {
          return false;
        }
      }

      return true;
    }

    // Handle Maps recursively
    if (value instanceof Map && filterValue instanceof Map) {
      const result = AreMapsEqual.areMapsEqual(value, filterValue, condition);
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

        if (!AreMapsEqual.compareDeep(valueRecord[key], filterRecord[key], condition)) {
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
