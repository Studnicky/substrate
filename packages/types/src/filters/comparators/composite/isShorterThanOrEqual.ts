/**
 * Checks if a value's length/size/magnitude is shorter/less than or equal to a threshold
 */

import { Guard } from '../../../guards/Guard.js';
import { IsArray } from '../atomic/isArray.js';
import { IsMap } from '../atomic/isMap.js';
import { IsNumber } from '../atomic/isNumber.js';
import { IsSet } from '../atomic/isSet.js';
import { IsString } from '../atomic/isString.js';

/**
 * Supported types:
 * - Strings: compares string.length
 * - Arrays: compares array.length
 * - Sets: compares set.size
 * - Maps: compares map.size
 * - Numbers: compares absolute value (magnitude)
 * - Objects with length property: compares obj.length
 */
export class IsShorterThanOrEqual {
  static isShorterThanOrEqual(value: unknown, threshold: number): boolean {
    // Strings and arrays
    if (IsString.isString(value) || IsArray.isArray(value)) {
      const result = value.length <= threshold;
      return result;
    }

    // Numbers - compare absolute value/magnitude
    if (IsNumber.isNumber(value)) {
      const result = Math.abs(value) <= threshold;
      return result;
    }

    // Sets and Maps
    if (IsSet.isSet(value) || IsMap.isMap(value)) {
      const result = value.size <= threshold;
      return result;
    }

    // Objects with a length property
    if (Guard.isObjectLike(value) && 'length' in value) {
      const length = Reflect.get(value, 'length');

      const result = IsNumber.isNumber(length) && length <= threshold;
      return result;
    }

    return false;
  }
}
