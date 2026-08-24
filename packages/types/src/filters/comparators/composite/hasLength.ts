/**
 * Universal length checker for strings, arrays, and objects with length property
 */


import { Guard } from '../../../guards/Guard.js';
import { isArray } from '../atomic/isArray.js';
import { isMap } from '../atomic/isMap.js';
import { isSet } from '../atomic/isSet.js';
import { isString } from '../atomic/isString.js';

/**
 * Checks if a value has a specific length (works with strings, arrays, Sets, Maps, etc.)
 * @param value - The value to check
 * @param length - The expected length
 * @returns true if value has the specified length, false otherwise
 *
 * Supported types:
 * - Strings: checks string.length
 * - Arrays: checks array.length
 * - Sets: checks set.size
 * - Maps: checks map.size
 * - Objects with length property: checks obj.length
 */
export function hasLength(value: unknown, length: number): boolean {
  // Strings and arrays
  if (isString(value) || isArray(value)) {
    return value.length === length;
  }

  // Sets and Maps
  if (isSet(value) || isMap(value)) {
    return value.size === length;
  }

  // Objects with a length property
  if (Guard.isObjectLike(value) && 'length' in value) {
    const objectLength = Reflect.get(value, 'length');
    return Guard.isNumber(objectLength) && objectLength === length;
  }

  return false;
}
