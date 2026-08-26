/**
 * Universal length checker for strings, arrays, and objects with length property
 */

import { Guard } from '../../../guards/Guard.js';
import { IsArray } from '../atomic/isArray.js';
import { IsMap } from '../atomic/isMap.js';
import { IsSet } from '../atomic/isSet.js';
import { IsString } from '../atomic/isString.js';

/**
 * Supported types:
 * - Strings: checks string.length
 * - Arrays: checks array.length
 * - Sets: checks set.size
 * - Maps: checks map.size
 * - Objects with length property: checks obj.length
 */
export class HasLength {
  static hasLength(value: unknown, length: number): boolean {
    // Strings and arrays
    if (IsString.isString(value) || IsArray.isArray(value)) {
      const result = value.length === length;
      return result;
    }

    // Sets and Maps
    if (IsSet.isSet(value) || IsMap.isMap(value)) {
      const result = value.size === length;
      return result;
    }

    // Objects with a length property
    if (Guard.isObjectLike(value) && 'length' in value) {
      const objectLength = Reflect.get(value, 'length');
      const result = Guard.isNumber(objectLength) && objectLength === length;
      return result;
    }

    return false;
  }
}
