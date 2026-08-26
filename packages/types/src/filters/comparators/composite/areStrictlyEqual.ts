/**
 * Strict deep equality comparison (like Jest's toStrictEqual)
 * Checks object keys, undefined properties, and array sparseness
 */

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Guard } from '../../../guards/Guard.js';
import { AreNaNEqual } from '../atomic/areNaNEqual.js';
import { AreTypesSame } from '../atomic/areTypesSame.js';
import { IsArray } from '../atomic/isArray.js';
import { IsDate } from '../atomic/isDate.js';
import { IsMap } from '../atomic/isMap.js';
import { IsNull } from '../atomic/isNull.js';
import { IsNumber } from '../atomic/isNumber.js';
import { IsSet } from '../atomic/isSet.js';
import { IsTypeOf } from '../atomic/isTypeOf.js';
import { IsUndefined } from '../atomic/isUndefined.js';

/**
 * Performs strict deep equality comparison like Jest's toStrictEqual
 * - Checks that objects have the same keys (including undefined values)
 * - Checks array sparseness (undefined vs missing indices)
 * - Checks object prototypes and constructors
 * - More strict than regular deep equality
 */
export class AreStrictlyEqual {
  static areStrictlyEqual(
    value: unknown,
    filterValue: unknown,
    condition: FilterConditionInterface = {}
  ): boolean {
    // Handle NaN
    if (IsNumber.isNumber(value) && IsNumber.isNumber(filterValue)) {
      if (Number.isNaN(value) || Number.isNaN(filterValue)) {
        const result = AreNaNEqual.areNaNEqual(value, filterValue);
        return result;
      }
    }

    // Quick reference check
    if (Object.is(value, filterValue)) {
      return true;
    }

    // Must be same type
    if (!AreTypesSame.areTypesSame(value, filterValue)) {
      return false;
    }

    // Handle null
    if (IsNull.isNull(value) || IsNull.isNull(filterValue)) {
      const result = value === filterValue;
      return result;
    }

    // Handle undefined explicitly
    if (IsUndefined.isUndefined(value) || IsUndefined.isUndefined(filterValue)) {
      const result = value === filterValue;
      return result;
    }

    // Arrays
    if (IsArray.isArray(value) && IsArray.isArray(filterValue)) {
      const result = AreStrictlyEqual.areArraysStrictlyEqual(value, filterValue, condition);
      return result;
    }

    // Dates
    if (IsDate.isDate(value) && IsDate.isDate(filterValue)) {
      const result = value.getTime() === filterValue.getTime();
      return result;
    }

    // RegExp
    if (Guard.isRegExp(value) && Guard.isRegExp(filterValue)) {
      const result = value.toString() === filterValue.toString();
      return result;
    }

    // Sets
    if (IsSet.isSet(value) && IsSet.isSet(filterValue)) {
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
    if (IsMap.isMap(value) && IsMap.isMap(filterValue)) {
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
    if (IsTypeOf.isTypeOf(value, 'object') && IsTypeOf.isTypeOf(filterValue, 'object')) {
      // Must be instances of the same constructor
      const valueRecord = value as Record<string, unknown>;
      const filterRecord = filterValue as Record<string, unknown>;

      if (valueRecord.constructor !== filterRecord.constructor) {
        return false;
      }

      const result = AreStrictlyEqual.areObjectsStrictlyEqual(valueRecord, filterRecord, condition);
      return result;
    }

    // Primitives
    const result = value === filterValue;
    return result;
  }

  /**
   * Checks if two arrays are strictly equal including sparse array handling
   */
  private static areArraysStrictlyEqual(value: unknown[], filterValue: unknown[], condition: FilterConditionInterface = {}): boolean {
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
