/**
 * Checks if a value's length/size/magnitude is shorter/less than a threshold
 */

import { Predicates } from '@studnicky/types';

/**
 * Supported types:
 * - Strings: compares string.length
 * - Arrays: compares array.length
 * - Sets: compares set.size
 * - Maps: compares map.size
 * - Numbers: compares absolute value (magnitude)
 * - Objects with length property: compares obj.length
 */
export class IsShorterThan {
  static isShorterThan(value: object | string | number | boolean | bigint | symbol | null | undefined, threshold: number): boolean {
    // Strings and arrays
    if (Predicates.isString(value) || Predicates.isArray(value)) {
      const result = value.length < threshold;
      return result;
    }

    // Numbers - compare absolute value/magnitude
    if (Predicates.isNumber(value)) {
      const result = Math.abs(value) < threshold;
      return result;
    }

    // Sets and Maps
    if (Predicates.isSet(value) || Predicates.isMap(value)) {
      const result = value.size < threshold;
      return result;
    }

    // Objects with a length property
    if (Predicates.isObjectLike(value) && 'length' in value) {
      const length = Reflect.get(value, 'length');

      const result = Predicates.isNumber(length) && length < threshold;
      return result;
    }

    return false;
  }
}
