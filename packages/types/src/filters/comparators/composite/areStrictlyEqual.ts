/**
 * Strict deep equality comparison (like Jest's toStrictEqual)
 * Checks object keys, undefined properties, and array sparseness
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areNaNEqual } from '../atomic/areNaNEqual.js';
import { areTypesSame } from '../atomic/areTypesSame.js';
import { isArray } from '../atomic/isArray.js';
import { isDate } from '../atomic/isDate.js';
import { isMap } from '../atomic/isMap.js';
import { isNull } from '../atomic/isNull.js';
import { isNumber } from '../atomic/isNumber.js';
import { isSet } from '../atomic/isSet.js';
import { isTypeOf } from '../atomic/isTypeOf.js';
import { isUndefined } from '../atomic/isUndefined.js';

/**
 * Checks if two arrays are strictly equal including sparse array handling
 */
function areArraysStrictlyEqual(value: unknown[], filterValue: unknown[], condition: FilterCondition = {}) : boolean {
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
    if (i in value && !compareStrictDeep(value[i], filterValue[i], condition)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if two objects are strictly equal including undefined properties
 */
function areObjectsStrictlyEqual(
  value: Record<string, unknown>,
  filterValue: Record<string, unknown>,
  condition: FilterCondition
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
  for (const key of keys1) {
    if (!compareStrictDeep(value[key], filterValue[key], condition)) {
      return false;
    }
  }

  // Check prototypes are the same
  if (Object.getPrototypeOf(value) !== Object.getPrototypeOf(filterValue)) {
    return false;
  }

  return true;
}

/**
 * Internal strict deep comparison
 */
function compareStrictDeep(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean {
  // Handle NaN
  if (isNumber(value) && isNumber(filterValue)) {
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return areNaNEqual(value, filterValue);
    }
  }

  // Quick reference check
  if (Object.is(value, filterValue)) {
    return true;
  }

  // Must be same type
  if (!areTypesSame(value, filterValue)) {
    return false;
  }

  // Handle null
  if (isNull(value) || isNull(filterValue)) {
    return value === filterValue;
  }

  // Handle undefined explicitly
  if (isUndefined(value) || isUndefined(filterValue)) {
    return value === filterValue;
  }

  // Arrays
  if (isArray(value) && isArray(filterValue)) {
    return areArraysStrictlyEqual(value, filterValue, condition);
  }

  // Dates
  if (isDate(value) && isDate(filterValue)) {
    return value.getTime() === filterValue.getTime();
  }

  // RegExp
  if (Guard.isRegExp(value) && Guard.isRegExp(filterValue)) {
    return value.toString() === filterValue.toString();
  }

  // Sets
  if (isSet(value) && isSet(filterValue)) {
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
  if (isMap(value) && isMap(filterValue)) {
    if (value.size !== filterValue.size) {
      return false;
    }
    for (const [
      key,
      val
    ] of value) {
      if (!filterValue.has(key) || !compareStrictDeep(val, filterValue.get(key), condition)) {
        return false;
      }
    }

    return true;
  }

  // Objects
  if (isTypeOf(value, 'object') && isTypeOf(filterValue, 'object')) {
    // Must be instances of the same constructor
    const valueObj = value as Record<string, unknown>;
    const filterObj = filterValue as Record<string, unknown>;

    if (valueObj.constructor !== filterObj.constructor) {
      return false;
    }

    return areObjectsStrictlyEqual(value as Record<string, unknown>, filterValue as Record<string, unknown>, condition);
  }

  // Primitives
  return value === filterValue;
}

/**
 * Performs strict deep equality comparison like Jest's toStrictEqual
 * - Checks that objects have the same keys (including undefined values)
 * - Checks array sparseness (undefined vs missing indices)
 * - Checks object prototypes and constructors
 * - More strict than regular deep equality
 *
 * @param value - First value to compare
 * @param filterValue - Second value to compare
 * @param condition - Filter condition for comparison options
 * @returns true if values are strictly deep equal, false otherwise
 */
export function areStrictlyEqual(
  value: unknown,
  filterValue: unknown,
  condition: FilterCondition = {}
): boolean {
  return compareStrictDeep(value, filterValue, condition);
}
