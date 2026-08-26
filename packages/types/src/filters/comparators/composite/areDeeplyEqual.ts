/**
 * Deep equality comparison for complex data structures
 *
 * Performs comprehensive deep equality checks that handle all JavaScript data types
 * including objects, arrays, Maps, Sets, Dates, RegExp, and primitives. Unlike
 * shallow equality (===), this function compares the actual content/structure
 * of objects and arrays recursively.
 *
 * Special handling includes:
 * - NaN values are considered equal (NaN === NaN returns true for deep equality)
 * - Date objects are compared by timestamp value
 * - RegExp objects are compared by their string representation
 * - Maps and Sets are compared by their contents
 * - Arrays and objects are compared element/property by element/property
 * - String comparisons respect case sensitivity settings from FilterConditionInterface
 */

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Predicates } from '../../../predicates/Predicates.js';
import { AreStringsEqual } from './areStringsEqual.js';

/**
 * Checks if two values are deeply equal by comparing their content rather than references
 *
 * @example
 * const obj1 = { user: { name: 'John', tags: ['admin', 'user'] } };
 * const obj2 = { user: { name: 'John', tags: ['admin', 'user'] } };
 * AreDeeplyEqual.areDeeplyEqual(obj1, obj2, condition); // true
 *
 * const arr1 = [1, [2, 3], { a: 4 }];
 * const arr2 = [1, [2, 3], { a: 4 }];
 * AreDeeplyEqual.areDeeplyEqual(arr1, arr2, condition); // true
 */
export class AreDeeplyEqual {
  static areDeeplyEqual(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    // Handle NaN specially - for deep equality, NaN should equal NaN
    if (Predicates.isNumber(value) && Predicates.isNumber(filterValue)) {
      if (Number.isNaN(value) || Number.isNaN(filterValue)) {
        const result = Predicates.areNaNEqual(value, filterValue);
        return result;
      }
    }

    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    // Handle null/undefined
    if (Predicates.isNull(value) || Predicates.isUndefined(value) || Predicates.isNull(filterValue) || Predicates.isUndefined(filterValue)) {
      const result = Predicates.areNullUndefinedEqual(value, filterValue);
      return result;
    }

    // Handle arrays and objects with deep equality
    if ((Predicates.isTypeOf(value, 'object') && !Predicates.isNull(value)) || (Predicates.isTypeOf(filterValue, 'object') && !Predicates.isNull(filterValue))) {
      const objectResult = AreDeeplyEqual.compareObjectTypes(value, filterValue);

      if (objectResult !== null) {
        return objectResult;
      }
    }

    // Strict type checking - no automatic coercion
    if (typeof value !== typeof filterValue) {
      return false;
    }

    // For strings, handle case sensitivity
    if (Predicates.isString(value) && Predicates.isString(filterValue)) {
      const result = AreStringsEqual.areStringsEqual(value, filterValue, condition);
      return result;
    }

    // For numbers, booleans, etc., use strict equality
    const result = value === filterValue;
    return result;
  }

  /**
   * Handles object type comparisons with proper type checking
   */
  private static compareObjectTypes(value: unknown, filterValue: unknown): boolean | null {
    // Both must be objects/arrays for comparison
    if (!Predicates.isTypeOf(value, 'object') || !Predicates.isTypeOf(filterValue, 'object') || Predicates.isNull(value) || Predicates.isNull(filterValue)) {
      return false;
    }

    // Arrays
    if (Predicates.areInstancesOf(value, filterValue, Array)) {
      const result = Predicates.areArraysEqual(value, filterValue as unknown[]);
      return result;
    }
    if (!Predicates.areInstancesOf(value, filterValue, Array) && (Predicates.isArray(value) || Predicates.isArray(filterValue))) {
      // One is array, the other is not
      return false;
    }

    // Date objects
    if (Predicates.areInstancesOf(value, filterValue, Date)) {
      const result = (value).getTime() === (filterValue as Date).getTime();
      return result;
    }
    if (!Predicates.areInstancesOf(value, filterValue, Date) && (Predicates.isDate(value) || Predicates.isDate(filterValue))) {
      // One is Date, the other is not
      return false;
    }

    // RegExp objects
    if (Predicates.areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)) {
      const result = (value as RegExp).toString() === (filterValue as RegExp).toString();
      return result;
    }
    if (!Predicates.areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)
      && (Predicates.isRegExp(value) || Predicates.isRegExp(filterValue))) {
      // One is RegExp, the other is not
      return false;
    }

    // Set objects
    if (Predicates.areInstancesOf(value, filterValue, Set as unknown as typeof Object)) {
      const firstSet = value as Set<unknown>;
      const secondSet = filterValue as Set<unknown>;

      if (firstSet.size !== secondSet.size) {
        return false;
      }
      for (const item of firstSet) {
        if (!secondSet.has(item)) {
          return false;
        }
      }

      return true;
    }
    if (!Predicates.areInstancesOf(value, filterValue, Set as unknown as typeof Object)
      && (Predicates.isSet(value) || Predicates.isSet(filterValue))) {
      // One is Set, the other is not
      return false;
    }

    // Map objects
    if (Predicates.isMap(value) && Predicates.isMap(filterValue)) {
      const result = Predicates.areMapsEqual(value, filterValue);
      return result;
    }
    if (Predicates.isMap(value) || Predicates.isMap(filterValue)) {
      // One is Map, the other is not
      return false;
    }

    // Plain objects
    if (!Predicates.isRecord(value) || !Predicates.isRecord(filterValue)) {
      return false;
    }
    const result = Predicates.areObjectsEqual(value, filterValue);
    return result;
  }
}
