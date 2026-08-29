/**
 * Strict deep equality comparison (like Jest's toStrictEqual)
 * Checks object keys, undefined properties, and array sparseness
 */

import { Predicates } from '@studnicky/types';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

/**
 * Performs strict deep equality comparison like Jest's toStrictEqual
 * - Checks that objects have the same keys (including undefined values)
 * - Checks array sparseness (undefined vs missing indices)
 * - Checks object prototypes and constructors
 * - More strict than regular deep equality
 */
export class AreStrictlyEqual {
  static areStrictlyEqual<Value>(
    value: Value,
    filterValue: Value,
    condition: FilterConditionInterface = {}
  ): boolean {
    // Handle NaN
    if (Predicates.isNumber(value) && Predicates.isNumber(filterValue)) {
      if (Number.isNaN(value) || Number.isNaN(filterValue)) {
        const result = Predicates.areNaNEqual(value, filterValue);
        return result;
      }
    }

    // Quick reference check
    if (Object.is(value, filterValue)) {
      return true;
    }

    // Must be same type
    if (!Predicates.areTypesSame(value, filterValue)) {
      return false;
    }

    // Handle null
    if (Predicates.isNull(value) || Predicates.isNull(filterValue)) {
      const result = value === filterValue;
      return result;
    }

    // Handle undefined explicitly
    if (Predicates.isUndefined(value) || Predicates.isUndefined(filterValue)) {
      const result = value === filterValue;
      return result;
    }

    // Arrays
    if (Predicates.isArray(value) && Predicates.isArray(filterValue)) {
      const result = AreStrictlyEqual.areArraysStrictlyEqual(value, filterValue, condition);
      return result;
    }

    // Dates
    if (Predicates.isDate(value) && Predicates.isDate(filterValue)) {
      const result = value.getTime() === filterValue.getTime();
      return result;
    }

    // RegExp
    if (Predicates.isRegExp(value) && Predicates.isRegExp(filterValue)) {
      const result = value.toString() === filterValue.toString();
      return result;
    }

    // Sets
    if (Predicates.isSet(value) && Predicates.isSet(filterValue)) {
      if (value.size !== filterValue.size) {
        return false;
      }
      for (const item of value) {
        if (!filterValue.has(item)) {
          return false;
        }
      }

      return true;
    }

    // Maps
    if (Predicates.isMap(value) && Predicates.isMap(filterValue)) {
      if (value.size !== filterValue.size) {
        return false;
      }
      for (const [
        key,
        mapValue
      ] of value) {
        if (!filterValue.has(key) || !AreStrictlyEqual.areStrictlyEqual(mapValue, filterValue.get(key), condition)) {
          return false;
        }
      }

      return true;
    }

    // Objects
    if (Predicates.isRecord(value) && Predicates.isRecord(filterValue)) {
      // Must be instances of the same constructor
      if (value.constructor !== filterValue.constructor) {
        return false;
      }

      const result = AreStrictlyEqual.areObjectsStrictlyEqual(value, filterValue, condition);
      return result;
    }

    // Primitives
    const result = value === filterValue;
    return result;
  }

  /**
   * Checks if two arrays are strictly equal including sparse array handling
   */
  private static areArraysStrictlyEqual(value: readonly unknown[], filterValue: readonly unknown[], condition: FilterConditionInterface = {}): boolean {
    if (value.length !== filterValue.length) {
      return false;
    }

    // Check for sparse arrays - must have same indices defined
    const keys1 = Object.keys(value).toSorted();
    const keys2 = Object.keys(filterValue).toSorted();

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }

    // Compare all elements including undefined
    for (let i = 0; i < value.length; i++) {
      if (i in value !== i in filterValue) {
        // One has undefined at this index, other doesn't
        return false;
      }
      if (i in value && !AreStrictlyEqual.areStrictlyEqual(value[i], filterValue[i], condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if two objects are strictly equal including undefined properties
   */
  private static areObjectsStrictlyEqual(
    value: Record<string, unknown>,
    filterValue: Record<string, unknown>,
    condition: FilterConditionInterface
  ): boolean {
    // Get all keys including those with undefined values
    const keys1 = Object.keys(value).toSorted();
    const keys2 = Object.keys(filterValue).toSorted();

    // Must have exact same keys
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }

    // Compare all properties including undefined ones
    const keysLength = keys1.length;

    for (let i = 0; i < keysLength; i++) {
      const key = keys1[i];

      if (key !== undefined && !AreStrictlyEqual.areStrictlyEqual(value[key], filterValue[key], condition)) {
        return false;
      }
    }

    // Check prototypes are the same
    if (Object.getPrototypeOf(value) !== Object.getPrototypeOf(filterValue)) {
      return false;
    }

    return true;
  }
}
