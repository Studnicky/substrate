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


import { Predicates } from '#runtime';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

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
  static areDeeplyEqual<Value>(value: Value, filterValue: Value, condition: FilterConditionInterface = {}): boolean {
    const nanResult = AreDeeplyEqual.compareNaN(value, filterValue);

    if (nanResult !== null) {
      return nanResult;
    }

    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    // Handle null/undefined
    if (AreDeeplyEqual.isNullish(value) || AreDeeplyEqual.isNullish(filterValue)) {
      const result = Predicates.areNullUndefinedEqual(value, filterValue);
      return result;
    }

    // Delegate structural runtime values to the shared predicate contract.
    if (AreDeeplyEqual.isStructural(value) || AreDeeplyEqual.isStructural(filterValue)) {
      const result = Predicates.areDeeplyEqual(value, filterValue);
      return result;
    }

    // Strict type checking - no automatic coercion
    if (typeof value !== typeof filterValue) {
      return false;
    }

    const result = AreDeeplyEqual.comparePrimitive(value, filterValue, condition);

    return result;
  }

  /** For strings, handles case sensitivity; for numbers, booleans, etc., uses strict equality. */
  private static comparePrimitive<Value>(value: Value, filterValue: Value, condition: FilterConditionInterface): boolean {
    if (Predicates.isString(value) && Predicates.isString(filterValue)) {
      const result = AreStringsEqual.areStringsEqual(value, filterValue, condition);

      return result;
    }

    const result = value === filterValue;

    return result;
  }

  /** NaN should equal NaN for deep equality; `null` means neither operand is a NaN number. */
  private static compareNaN<Value>(value: Value, filterValue: Value): boolean | null {
    if (!Predicates.isNumber(value) || !Predicates.isNumber(filterValue)) {
      return null;
    }
    if (!Number.isNaN(value) && !Number.isNaN(filterValue)) {
      return null;
    }

    const result = Predicates.areNaNEqual(value, filterValue);

    return result;
  }

  private static isNullish(value: unknown): boolean {
    const result = Predicates.isNull(value) || Predicates.isUndefined(value);

    return result;
  }

  private static isStructural(value: unknown): boolean {
    const result = Predicates.isTypeOf(value, 'object') && !Predicates.isNull(value);

    return result;
  }
}
