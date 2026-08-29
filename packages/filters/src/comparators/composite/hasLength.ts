/**
 * Universal length checker for strings, arrays, and objects with length property
 */

import { Predicates } from '@studnicky/types';

/**
 * Supported types:
 * - Strings: checks string.length
 * - Arrays: checks array.length
 * - Sets: checks set.size
 * - Maps: checks map.size
 * - Objects with length property: checks obj.length
 */
export class HasLength {
  static hasLength(value: object | string | number | boolean | bigint | symbol | null | undefined, length: number): boolean {
    // Strings and arrays
    if (Predicates.isString(value) || Predicates.isArray(value)) {
      const result = value.length === length;
      return result;
    }

    // Sets and Maps
    if (Predicates.isSet(value) || Predicates.isMap(value)) {
      const result = value.size === length;
      return result;
    }

    // Objects with a length property
    if (Predicates.isObjectLike(value) && 'length' in value) {
      const objectLength = Reflect.get(value, 'length');
      const result = Predicates.isNumber(objectLength) && objectLength === length;
      return result;
    }

    return false;
  }
}
