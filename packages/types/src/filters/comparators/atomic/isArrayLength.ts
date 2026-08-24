/**
 * Checks if an array has a specific length
 */

import type { FilterValue } from '../../types.js';

export class IsArrayLength {
  static isArrayLength(array: FilterValue, expectedLength: FilterValue): boolean   {
    if (!Array.isArray(array) || typeof expectedLength !== 'number') {
      return false;
    }

    return array.length === expectedLength;
  }
}
