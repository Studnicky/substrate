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

import { Guard } from '../../../guards/Guard.js';
import { AreArraysEqual } from '../atomic/areArraysEqual.js';
import { AreInstancesOf } from '../atomic/areInstancesOf.js';
import { AreMapsEqual } from '../atomic/areMapsEqual.js';
import { AreNaNEqual } from '../atomic/areNaNEqual.js';
import { AreNullUndefinedEqual } from '../atomic/areNullUndefinedEqual.js';
import { AreObjectsEqual } from '../atomic/areObjectsEqual.js';
import { IsArray } from '../atomic/isArray.js';
import { IsDate } from '../atomic/isDate.js';
import { IsMap } from '../atomic/isMap.js';
import { IsNull } from '../atomic/isNull.js';
import { IsNumber } from '../atomic/isNumber.js';
import { IsRegExp } from '../atomic/isRegExp.js';
import { IsSet } from '../atomic/isSet.js';
import { IsString } from '../atomic/isString.js';
import { IsTypeOf } from '../atomic/isTypeOf.js';
import { IsUndefined } from '../atomic/isUndefined.js';
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
    if (IsNumber.isNumber(value) && IsNumber.isNumber(filterValue)) {
      if (Number.isNaN(value) || Number.isNaN(filterValue)) {
        const result = AreNaNEqual.areNaNEqual(value, filterValue);
        return result;
      }
    }

    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    // Handle null/undefined
    if (IsNull.isNull(value) || IsUndefined.isUndefined(value) || IsNull.isNull(filterValue) || IsUndefined.isUndefined(filterValue)) {
      const result = AreNullUndefinedEqual.areNullUndefinedEqual(value, filterValue);
      return result;
    }

    // Handle arrays and objects with deep equality
    if ((IsTypeOf.isTypeOf(value, 'object') && !IsNull.isNull(value)) || (IsTypeOf.isTypeOf(filterValue, 'object') && !IsNull.isNull(filterValue))) {
      const objectResult = AreDeeplyEqual.compareObjectTypes(value, filterValue, condition);

      if (objectResult !== null) {
        return objectResult;
      }
    }

    // Strict type checking - no automatic coercion
    if (typeof value !== typeof filterValue) {
      return false;
    }

    // For strings, handle case sensitivity
    if (IsString.isString(value) && IsString.isString(filterValue)) {
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
  private static compareObjectTypes(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean | null {
    // Both must be objects/arrays for comparison
    if (!IsTypeOf.isTypeOf(value, 'object') || !IsTypeOf.isTypeOf(filterValue, 'object') || IsNull.isNull(value) || IsNull.isNull(filterValue)) {
      return false;
    }

    // Arrays
    if (AreInstancesOf.areInstancesOf(value, filterValue, Array)) {
      const result = AreArraysEqual.areArraysEqual(value, filterValue as unknown[], condition);
      return result;
    }
    if (!AreInstancesOf.areInstancesOf(value, filterValue, Array) && (IsArray.isArray(value) || IsArray.isArray(filterValue))) {
      // One is array, the other is not
      return false;
    }

    // Date objects
    if (AreInstancesOf.areInstancesOf(value, filterValue, Date)) {
      const result = (value).getTime() === (filterValue as Date).getTime();
      return result;
    }
    if (!AreInstancesOf.areInstancesOf(value, filterValue, Date) && (IsDate.isDate(value) || IsDate.isDate(filterValue))) {
      // One is Date, the other is not
      return false;
    }

    // RegExp objects
    if (AreInstancesOf.areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)) {
      const result = (value as RegExp).toString() === (filterValue as RegExp).toString();
      return result;
    }
    if (!AreInstancesOf.areInstancesOf(value, filterValue, RegExp as unknown as typeof Object)
      && (IsRegExp.isRegExp(value) || IsRegExp.isRegExp(filterValue))) {
      // One is RegExp, the other is not
      return false;
    }

    // Set objects
    if (AreInstancesOf.areInstancesOf(value, filterValue, Set as unknown as typeof Object)) {
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
    if (!AreInstancesOf.areInstancesOf(value, filterValue, Set as unknown as typeof Object)
      && (IsSet.isSet(value) || IsSet.isSet(filterValue))) {
      // One is Set, the other is not
      return false;
    }

    // Map objects
    if (IsMap.isMap(value) && IsMap.isMap(filterValue)) {
      const result = AreMapsEqual.areMapsEqual(value, filterValue, condition);
      return result;
    }
    if (IsMap.isMap(value) || IsMap.isMap(filterValue)) {
      // One is Map, the other is not
      return false;
    }

    // Plain objects
    if (!Guard.isRecord(value) || !Guard.isRecord(filterValue)) {
      return false;
    }
    const result = AreObjectsEqual.areObjectsEqual(value, filterValue, condition);
    return result;
  }
}
