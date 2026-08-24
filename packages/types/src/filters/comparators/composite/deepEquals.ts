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
 * - String comparisons respect case sensitivity settings from FilterCondition
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areArraysEqual } from '../atomic/areArraysEqual.js';
import { areInstancesOf } from '../atomic/areInstancesOf.js';
import { areMapsEqual } from '../atomic/areMapsEqual.js';
import { areNaNEqual } from '../atomic/areNaNEqual.js';
import { areNullUndefinedEqual } from '../atomic/areNullUndefinedEqual.js';
import { areObjectsEqual } from '../atomic/areObjectsEqual.js';
import { isArray } from '../atomic/isArray.js';
import { isDate } from '../atomic/isDate.js';
import { isMap } from '../atomic/isMap.js';
import { isNull } from '../atomic/isNull.js';
import { isNumber } from '../atomic/isNumber.js';
import { isRegExp } from '../atomic/isRegExp.js';
import { isSet } from '../atomic/isSet.js';
import { isString } from '../atomic/isString.js';
import { isTypeOf } from '../atomic/isTypeOf.js';
import { isUndefined } from '../atomic/isUndefined.js';
import { areStringsEqual } from './areStringsEqual.js';

/**
 * Handles object type comparisons with proper type checking
 */
function compareObjectTypes(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean | null {
  // Both must be objects/arrays for comparison
  if (!isTypeOf(value, 'object') || !isTypeOf(filterValue, 'object') || isNull(value) || isNull(filterValue)) {
    return false;
  }

  // Arrays
  if (areInstancesOf(value, filterValue, Array)) {
    return areArraysEqual(value, filterValue as unknown[], condition);
  }
  if (!areInstancesOf(value, filterValue, Array) && (isArray(value) || isArray(filterValue))) {
    // One is array, the other is not
    return false;
  }

  // Date objects
  if (areInstancesOf(value, filterValue, Date)) {
    return (value).getTime() === (filterValue as Date).getTime();
  }
  if (!areInstancesOf(value, filterValue, Date) && (isDate(value) || isDate(filterValue))) {
    // One is Date, the other is not
    return false;
  }

  // RegExp objects
  if (areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)) {
    return (value as RegExp).toString() === (filterValue as RegExp).toString();
  }
  if (!areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)
    && (isRegExp(value) || isRegExp(filterValue))) {
    // One is RegExp, the other is not
    return false;
  }

  // Set objects
  if (areInstancesOf(value, filterValue, Set as unknown as typeof Object)) {
    const set1 = value as Set<unknown>;
    const set2 = filterValue as Set<unknown>;

    if (set1.size !== set2.size) {
      return false;
    }
    for (const item of set1) {
      if (!set2.has(item)) {
        return false;
      }
    }

    return true;
  }
  if (!areInstancesOf(value, filterValue, Set as unknown as typeof Object)
    && (isSet(value) || isSet(filterValue))) {
    // One is Set, the other is not
    return false;
  }

  // Map objects
  if (isMap(value) && isMap(filterValue)) {
    return areMapsEqual(value, filterValue, condition);
  }
  if (isMap(value) || isMap(filterValue)) {
    // One is Map, the other is not
    return false;
  }

  // Plain objects
  if (!Guard.isRecord(value) || !Guard.isRecord(filterValue)) {
    return false;
  }
  return areObjectsEqual(value, filterValue, condition);
}

/**
 * Checks if two values are deeply equal by comparing their content rather than references
 *
 * This is the main deep equality function that orchestrates comparisons between
 * different data types. It handles type-specific comparison logic and ensures
 * that complex nested structures are properly compared.
 *
 * @param value - The first value to compare
 * @param filterValue - The second value to compare
 * @param condition - FilterCondition containing comparison settings (e.g., case sensitivity)
 * @returns true if the values are deeply equal, false otherwise
 *
 * @example
 * const obj1 = { user: { name: 'John', tags: ['admin', 'user'] } };
 * const obj2 = { user: { name: 'John', tags: ['admin', 'user'] } };
 * areDeeplyEqual(obj1, obj2, condition); // true
 *
 * const arr1 = [1, [2, 3], { a: 4 }];
 * const arr2 = [1, [2, 3], { a: 4 }];
 * areDeeplyEqual(arr1, arr2, condition); // true
 */
export function areDeeplyEqual(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean {
  // Handle NaN specially - for deep equality, NaN should equal NaN
  if (isNumber(value) && isNumber(filterValue)) {
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return areNaNEqual(value, filterValue);
    }
  }

  // Quick reference equality check
  if (value === filterValue) {
    return true;
  }

  // Handle null/undefined
  if (isNull(value) || isUndefined(value) || isNull(filterValue) || isUndefined(filterValue)) {
    return areNullUndefinedEqual(value, filterValue);
  }

  // Handle arrays and objects with deep equality
  if ((isTypeOf(value, 'object') && !isNull(value)) || (isTypeOf(filterValue, 'object') && !isNull(filterValue))) {
    const objectResult = compareObjectTypes(value, filterValue, condition);

    if (objectResult !== null) {
      return objectResult;
    }
  }

  // Strict type checking - no automatic coercion
  if (typeof value !== typeof filterValue) {
    return false;
  }

  // For strings, handle case sensitivity
  if (isString(value) && isString(filterValue)) {
    return areStringsEqual(value, filterValue, condition);
  }

  // For numbers, booleans, etc., use strict equality
  return value === filterValue;
}
