/**
 * Checks if an object has exactly the specified number of properties
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

export class IsObjectPropertyCount {
  static isObjectPropertyCount(object: FilterValueEntity.Type, expectedCount: FilterValueEntity.Type): boolean   {
    if (typeof object !== 'object' || object === null || typeof expectedCount !== 'number') {
      return false;
    }

    const result = Object.keys(object).length === expectedCount;
    return result;
  }
}
