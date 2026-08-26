/**
 * Checks if an array has a specific length
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

export class IsArrayLength {
  static isArrayLength(array: FilterValueEntity.Type, expectedLength: FilterValueEntity.Type): boolean   {
    if (!Array.isArray(array) || typeof expectedLength !== 'number') {
      return false;
    }

    const result = array.length === expectedLength;
    return result;
  }
}
