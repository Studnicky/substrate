/**
 * Checks if a value's length/size/magnitude is shorter/less than a threshold
 */


import { Guard } from '../../../guards/Guard.js';
import { isArray } from '../atomic/isArray.js';
import { isMap } from '../atomic/isMap.js';
import { isNumber } from '../atomic/isNumber.js';
import { isSet } from '../atomic/isSet.js';
import { isString } from '../atomic/isString.js';

/**
 * Checks if a value's length, size, or magnitude is less than the specified threshold
 * @param value - The value to check
 * @param threshold - The threshold to compare against
 * @returns true if value's length/size/magnitude is less than threshold, false otherwise
 *
 * Supported types:
 * - Strings: compares string.length
 * - Arrays: compares array.length
 * - Sets: compares set.size
 * - Maps: compares map.size
 * - Numbers: compares absolute value (magnitude)
 * - Objects with length property: compares obj.length
 */
export function isShorterThan(value: unknown, threshold: number): boolean {
  // Strings and arrays
  if (isString(value) || isArray(value)) {
    return value.length < threshold;
  }

  // Numbers - compare absolute value/magnitude
  if (isNumber(value)) {
    return Math.abs(value) < threshold;
  }

  // Sets and Maps
  if (isSet(value) || isMap(value)) {
    return value.size < threshold;
  }

  // Objects with a length property
  if (Guard.isObjectLike(value) && 'length' in value) {
    const length = Reflect.get(value, 'length');

    return isNumber(length) && length < threshold;
  }

  return false;
}
